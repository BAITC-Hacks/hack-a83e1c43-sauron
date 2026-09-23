import importlib
import json
import os
from io import StringIO
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.apps import apps
from django.core.management import call_command
from django.test import SimpleTestCase, TestCase
from rest_framework.test import APITestCase

from .management.commands.seed_demo import TASKS, TEAMS
from .models import BusinessTask, Proposal, TeamProfile
from .scoring import SCORING_RULES, calculate_readiness, readiness_level
from .services.ai import InvalidAIResponse, QUESTION_FIELDS, generate_clarifying_questions, validate_ai_payload


class PublicationRegressionTests(APITestCase):
    def setUp(self):
        self.task = BusinessTask.objects.create(title="Проверка спроса пекарни")
        self.url = f"/api/v1/tasks/{self.task.pk}/"
        self.team = TeamProfile.objects.create(name="Команда проверки")

    def publish(self):
        result = self.client.post(self.url + "publish/", {"confirmed": True}, format="json")
        self.assertEqual(result.status_code, 200, result.data)
        return result

    def test_status_cannot_bypass_confirmation(self):
        for value in ("published", "closed", "draft"):
            with self.subTest(value=value):
                result = self.client.post("/api/v1/tasks/", {"title": "Обход статуса", "status": value}, format="json")
                self.assertEqual(result.status_code, 400)
                result = self.client.patch(self.url, {"status": value}, format="json")
                self.assertEqual(result.status_code, 400)
        self.assertEqual(self.client.get("/api/v1/tasks/").data, [])

    def test_empty_card_is_rejected_but_draft_without_title_can_be_saved(self):
        for payload in ({}, {"title": "  ", "draft_text": " "}):
            self.assertEqual(self.client.post("/api/v1/tasks/", payload, format="json").status_code, 400)
        result = self.client.post("/api/v1/tasks/", {"draft_text": "Хотим проверить спрос на выпечку"}, format="json")
        self.assertEqual(result.status_code, 201)
        self.assertEqual(self.client.post(f'/api/v1/tasks/{result.data["id"]}/publish/', {"confirmed": True}, format="json").status_code, 400)

    def test_publish_requires_boolean_confirmation(self):
        for value in (False, "true", 1, None):
            with self.subTest(value=value):
                self.assertEqual(self.client.post(self.url + "publish/", {"confirmed": value}, format="json").status_code, 400)

    def test_publication_is_idempotent_and_low_score_accepts_proposals(self):
        first = self.publish()
        self.assertEqual(first.data["score"], 0)
        self.assertEqual(self.publish().data["published_at"], first.data["published_at"])
        self.assertEqual(len(self.client.get("/api/v1/tasks/?max_score=0").data), 1)
        result = self.client.post(self.url + "proposals/", {
            "team": self.team.pk, "idea": "Проверим сезонность спроса", "plan": "Анализ и прототип", "timeline": "2 недели",
        }, format="json")
        self.assertEqual(result.status_code, 201)

    def test_published_changes_need_confirmation_and_keep_last_confirmed_version(self):
        first = self.publish()
        for value in (None, False, "true", 1):
            result = self.client.patch(self.url, {"need": "Проверить сезонность спроса", "confirmed": value}, format="json")
            self.assertEqual(result.status_code, 400)
            self.task.refresh_from_db()
            self.assertEqual(self.task.need, "")
        result = self.client.patch(self.url, {"need": "Проверить сезонность спроса", "confirmed": True}, format="json")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["status"], "published")
        self.assertEqual(result.data["score"], 10)
        self.assertEqual(result.data["published_at"], first.data["published_at"])
        self.assertNotIn("confirmed", result.data)
        self.assertEqual(self.client.patch(self.url, {"title": "", "confirmed": True}, format="json").status_code, 400)

    def test_draft_edit_does_not_require_confirmation(self):
        self.assertEqual(self.client.patch(self.url, {"need": "Проверить сезонность спроса"}, format="json").status_code, 200)

    def test_invalid_filters_return_400(self):
        for query in ("min_score=abc", "max_score=abc", "min_score=-1", "max_score=101", "min_score=80&max_score=20", "readiness_level=unknown", "include_drafts=unknown"):
            with self.subTest(query=query):
                self.assertEqual(self.client.get("/api/v1/tasks/?" + query).status_code, 400)

    def test_filters_do_not_break_detail_routes(self):
        self.assertEqual(self.client.get(self.url + "?min_score=abc").status_code, 200)

    def test_closed_task_cannot_publish_or_accept_proposals(self):
        self.task.status = BusinessTask.Status.CLOSED
        self.task.save()
        self.assertEqual(self.client.post(self.url + "publish/", {"confirmed": True}, format="json").status_code, 400)
        self.assertEqual(self.client.post(self.url + "proposals/", {}, format="json").status_code, 400)

    def test_decision_rejected_on_draft_or_closed_task(self):
        proposal = Proposal.objects.create(task=self.task, team=self.team, idea="Идея", plan="План", timeline="Неделя")
        for state in (BusinessTask.Status.DRAFT, BusinessTask.Status.CLOSED):
            self.task.status = state
            self.task.save()
            self.assertEqual(self.client.post(f"/api/v1/proposals/{proposal.pk}/decision/", {"decision": "accepted"}, format="json").status_code, 400)
        proposal.refresh_from_db()
        self.assertEqual(proposal.status, Proposal.Status.PENDING)

    def test_business_can_reject_everyone_without_closing_task(self):
        self.publish()
        for _ in range(2):
            proposal = Proposal.objects.create(task=self.task, team=self.team, idea="Идея", plan="План", timeline="Неделя")
            self.assertEqual(self.client.post(f"/api/v1/proposals/{proposal.pk}/decision/", {"decision": "rejected"}, format="json").status_code, 200)
        self.assertEqual(self.task.proposals.filter(status="rejected").count(), 2)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, "published")

    def test_invalid_proposal_does_not_create_record(self):
        self.publish()
        self.assertEqual(self.client.post(self.url + "proposals/", {"team": self.team.pk}, format="json").status_code, 400)
        self.assertFalse(Proposal.objects.exists())

    def test_analysis_limits_and_card_fields(self):
        for payload in ({"draft_text": "abc"}, {"draft_text": "a" * 12001}, {"draft_text": "Описание задачи", "card": {"budget": "100"}}):
            self.assertEqual(self.client.post("/api/v1/tasks/analyze/", payload, format="json").status_code, 400)


class ScoringRegressionTests(SimpleTestCase):
    def test_level_boundaries(self):
        for value, expected in [(0, "draft"), (39, "draft"), (40, "working"), (69, "working"), (70, "ready"), (89, "ready"), (90, "priority"), (100, "priority")]:
            with self.subTest(score=value):
                self.assertEqual(readiness_level(value), expected)

    def test_placeholders_do_not_earn_points(self):
        for value in ("x", "xxx", "?", "   ", "test", "тест", "TODO", "не знаю"):
            with self.subTest(value=value):
                values = {field: value for rule in SCORING_RULES for field in rule["fields"]}
                result = calculate_readiness(values)
                self.assertEqual(result["score"], 0)
                self.assertEqual(len(result["missing_fields"]), 9)
                if value.strip():
                    self.assertEqual(len(result["quality_warnings"]), 9)

    def test_partial_two_field_blocks_and_full_weights(self):
        self.assertEqual(calculate_readiness({"context": "Контекст бизнеса", "business_contact": "Куратор проекта"})["score"], 15)
        self.assertEqual(calculate_readiness(TASKS[0])["score"], 100)
        self.assertEqual(sum(rule["max_points"] for rule in SCORING_RULES), 100)


@patch.dict(os.environ, {"AI_PROVIDER": "mock"})
class AIRegressionTests(SimpleTestCase):
    def payload(self):
        return {"questions": [{"field": key, "question": value} for key, value in list(QUESTION_FIELDS.items())[:3]], "missing_fields": ["data"]}

    def test_mock_is_contextual_and_prioritizes_missing_fields(self):
        bakery = generate_clarifying_questions("Пекарне нужен прогноз спроса")
        education = generate_clarifying_questions("Нужно помогать студентам курса")
        self.assertNotEqual(bakery["questions"], education["questions"])
        card = {"users": "Управляющий пекарни", "data": "Продажи за год по дням"}
        response = generate_clarifying_questions("Пекарне нужен прогноз спроса", card)
        self.assertNotIn("users", [item["field"] for item in response["questions"]])
        self.assertNotIn("data", response["missing_fields"])
        self.assertGreaterEqual(len(response["questions"]), 3)
        self.assertNotIn("fallback_reason", response)

    def test_complete_card_still_has_three_review_questions(self):
        result = generate_clarifying_questions(TASKS[0]["draft_text"], TASKS[0])
        self.assertEqual(len(result["questions"]), 3)
        self.assertEqual(result["missing_fields"], [])

    def test_invalid_structures_are_rejected(self):
        bad = [[], None, {"questions": [], "missing_fields": []}]
        for field in ("budget", [], None):
            payload = self.payload()
            payload["questions"][0]["field"] = field
            bad.append(payload)
        for value in (12, {}, " ", "x" * 601):
            payload = self.payload()
            payload["questions"][0]["question"] = value
            bad.append(payload)
        for value in ("data", ["unknown"], [None], ["data", "data"]):
            bad.append({**self.payload(), "missing_fields": value})
        payload = self.payload()
        payload["questions"][1] = payload["questions"][0]
        bad.append(payload)
        for payload in bad:
            with self.subTest(payload=payload), self.assertRaises(InvalidAIResponse):
                validate_ai_payload(payload)

    @patch.dict(os.environ, {"AI_PROVIDER": "openai", "OPENAI_API_KEY": ""})
    def test_missing_key_is_explicit_fallback(self):
        result = generate_clarifying_questions("Описание задачи бизнеса")
        self.assertEqual(result["provider"], "mock")
        self.assertEqual(result["fallback_reason"], "missing_api_key")

    @patch.dict(os.environ, {"AI_PROVIDER": "openai", "OPENAI_API_KEY": "unit-test-only"})
    def test_sdk_contract_and_valid_response(self):
        client = MagicMock()
        client.return_value.__enter__.return_value.responses.create.return_value.output_text = json.dumps(self.payload())
        with patch.dict("sys.modules", {"openai": SimpleNamespace(OpenAI=client)}):
            result = generate_clarifying_questions("Описание задачи бизнеса", {"users": "Менеджеры"})
        self.assertEqual(result["provider"], "openai")
        client.assert_called_once_with(api_key="unit-test-only", timeout=15.0, max_retries=0)
        args = client.return_value.__enter__.return_value.responses.create.call_args.kwargs
        self.assertTrue(args["text"]["format"]["strict"])
        self.assertFalse(args["store"])
        self.assertEqual(json.loads(args["input"])["card"], {"users": "Менеджеры"})

    @patch.dict(os.environ, {"AI_PROVIDER": "openai", "OPENAI_API_KEY": "unit-test-only"})
    def test_bad_json_and_unknown_fields_fall_back(self):
        for raw in ("not json", json.dumps({"questions": [{"field": "budget", "question": "Какой бюджет?"}] * 3, "missing_fields": []})):
            client = MagicMock()
            client.return_value.__enter__.return_value.responses.create.return_value.output_text = raw
            with patch.dict("sys.modules", {"openai": SimpleNamespace(OpenAI=client)}):
                result = generate_clarifying_questions("Описание задачи бизнеса")
            self.assertEqual(result["provider"], "mock")
            self.assertEqual(result["fallback_reason"], "invalid_response")
            self.assertGreaterEqual(len(result["questions"]), 3)

    @patch.dict(os.environ, {"AI_PROVIDER": "openai", "OPENAI_API_KEY": "unit-test-only"})
    def test_timeout_falls_back_without_logging_sensitive_text(self):
        with patch("challenges.services.ai._openai_response", side_effect=TimeoutError("secret draft")), self.assertLogs("challenges.services.ai", level="WARNING") as logs:
            result = generate_clarifying_questions("Описание задачи бизнеса")
        self.assertEqual(result["fallback_reason"], "provider_error")
        self.assertNotIn("secret draft", " ".join(logs.output))
        self.assertNotIn("unit-test-only", " ".join(logs.output))


class SeedRegressionTests(TestCase):
    def seed(self):
        call_command("seed_demo", stdout=StringIO())

    def test_seed_preserves_edits_decisions_dates_and_multiple_proposals(self):
        self.seed()
        task = BusinessTask.objects.get(demo_key="task-1")
        original_date = task.published_at
        task.title, task.need, task.status = "Изменённая задача", "Новая потребность", "draft"
        task.save()
        team = TeamProfile.objects.get(demo_key="team-1")
        team.name = "Новое имя команды"
        team.save()
        proposal = Proposal.objects.get(demo_key="proposal-1")
        proposal.idea, proposal.status = "Изменённая идея", "accepted"
        proposal.save()
        Proposal.objects.create(task=task, team=team, idea="Второй отклик", plan="Новый план", timeline="Неделя")
        self.seed()
        self.seed()
        task.refresh_from_db()
        team.refresh_from_db()
        proposal.refresh_from_db()
        self.assertEqual((BusinessTask.objects.count(), TeamProfile.objects.count(), Proposal.objects.count()), (5, 5, 6))
        self.assertEqual((task.title, task.need, task.status, task.published_at), ("Изменённая задача", "Новая потребность", "draft", original_date))
        self.assertEqual(team.name, "Новое имя команды")
        self.assertEqual((proposal.idea, proposal.status), ("Изменённая идея", "accepted"))
        self.assertFalse(Proposal.objects.exclude(prototype_url="").exists())

    def test_migration_adopts_legacy_seed_without_overwriting_user_edits(self):
        task = BusinessTask.objects.create(**{**TASKS[0], "title": "Название изменено пользователем"})
        team = TeamProfile.objects.create(**TEAMS[0])
        proposal = Proposal.objects.create(task=task, team=team, idea="Своя идея", plan="План", timeline="Неделя", prototype_url="https://example.com/hackalem-demo-1", status="accepted")
        real = Proposal.objects.create(task=task, team=team, idea="Второй отклик", plan="План", timeline="Неделя", prototype_url="https://github.com/BAITC-Hacks/hack-a83e1c43-sauron")
        importlib.import_module("challenges.migrations.0002_demo_keys").identify_existing_demo(apps, None)
        self.seed()
        task.refresh_from_db()
        proposal.refresh_from_db()
        real.refresh_from_db()
        self.assertEqual(task.demo_key, "task-1")
        self.assertEqual(task.title, "Название изменено пользователем")
        self.assertEqual((proposal.demo_key, proposal.idea, proposal.status, proposal.prototype_url), ("proposal-1", "Своя идея", "accepted", ""))
        self.assertTrue(real.prototype_url.startswith("https://github.com/"))
        self.assertEqual(BusinessTask.objects.count(), 5)
