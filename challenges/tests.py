import os
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from .models import BusinessTask, Proposal, TeamProfile


class ReadinessScoringTests(TestCase):
    def test_empty_task_starts_as_draft(self):
        task = BusinessTask.objects.create(draft_text="Нужен образовательный сервис")

        self.assertEqual(task.score, 0)
        self.assertEqual(task.readiness_level, "draft")

    def test_score_recalculates_after_edit(self):
        task = BusinessTask.objects.create(
            context="Студенты теряют интерес к онлайн-курсу.",
            need="Нужно находить группы риска.",
            users="Студенты первого курса.",
        )
        initial_score = task.score

        task.data = "Посещаемость и результаты тестов."
        task.expected_result = "Прототип панели для куратора."
        task.success_criteria = "Снижение отсева на 15 процентов."
        task.constraints = "Только обезличенные данные."
        task.business_contact = "Куратор программы"
        task.interaction_format = "Созвон раз в неделю"
        task.save()

        self.assertLess(initial_score, task.score)
        self.assertEqual(task.score, 100)
        self.assertEqual(task.readiness_level, "priority")


class TaskFlowAPITests(APITestCase):
    def setUp(self):
        self.task_payload = {
            "title": "Выявление риска отсева",
            "draft_text": "Нужно помочь кураторам поддерживать студентов.",
            "industry": "education",
            "context": "Студенты теряют интерес к онлайн-курсу.",
            "need": "Нужно находить группы риска.",
            "users": "Студенты первого курса и кураторы.",
            "data": "Посещаемость и результаты тестов.",
            "constraints": "Только обезличенные данные.",
            "expected_result": "Прототип панели для куратора.",
            "success_criteria": "Снижение отсева на 15 процентов.",
            "business_contact": "Куратор программы",
            "interaction_format": "Созвон раз в неделю",
        }

    @patch.dict(os.environ, {"AI_PROVIDER": "mock"})
    def test_analyze_returns_at_least_three_questions(self):
        response = self.client.post(
            "/api/v1/tasks/analyze/",
            {"draft_text": "Нужен AI-помощник для студентов."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["questions"]), 3)
        self.assertEqual(response.data["provider"], "mock")

    def test_publish_catalog_and_proposal_decision(self):
        create_response = self.client.post("/api/v1/tasks/", self.task_payload, format="json")
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        task_id = create_response.data["id"]
        self.assertEqual(create_response.data["score"], 100)

        catalog_before = self.client.get("/api/v1/tasks/")
        self.assertEqual(catalog_before.status_code, status.HTTP_200_OK)
        self.assertEqual(len(catalog_before.data), 0)

        not_confirmed = self.client.post(f"/api/v1/tasks/{task_id}/publish/", {}, format="json")
        self.assertEqual(not_confirmed.status_code, status.HTTP_400_BAD_REQUEST)

        publish_response = self.client.post(
            f"/api/v1/tasks/{task_id}/publish/",
            {"confirmed": True},
            format="json",
        )
        self.assertEqual(publish_response.status_code, status.HTTP_200_OK)
        self.assertEqual(publish_response.data["status"], "published")

        catalog_after = self.client.get("/api/v1/tasks/?readiness_level=priority")
        self.assertEqual(len(catalog_after.data), 1)

        team_response = self.client.post(
            "/api/v1/teams/",
            {
                "name": "EduMinds",
                "interests": "EdTech",
                "skills": "Data analysis, UX",
                "technologies": "Python, Django",
            },
            format="json",
        )
        self.assertEqual(team_response.status_code, status.HTTP_201_CREATED)

        proposal_response = self.client.post(
            f"/api/v1/tasks/{task_id}/proposals/",
            {
                "team": team_response.data["id"],
                "idea": "Сделаем панель риска отсева.",
                "plan": "Сначала данные, затем интерфейс и демонстрация.",
                "timeline": "2 недели",
                "prototype_url": "https://example.com/prototype",
            },
            format="json",
        )
        self.assertEqual(proposal_response.status_code, status.HTTP_201_CREATED)

        decision_response = self.client.post(
            f"/api/v1/proposals/{proposal_response.data['id']}/decision/",
            {"decision": "accepted"},
            format="json",
        )
        self.assertEqual(decision_response.status_code, status.HTTP_200_OK)
        self.assertEqual(decision_response.data["status"], "accepted")

    def test_business_can_choose_multiple_or_no_teams(self):
        create_response = self.client.post("/api/v1/tasks/", self.task_payload, format="json")
        task_id = create_response.data["id"]
        self.client.post(f"/api/v1/tasks/{task_id}/publish/", {"confirmed": True}, format="json")

        team_ids = []
        for name in ["DataCraft", "VisionLab", "GreenByte"]:
            response = self.client.post("/api/v1/teams/", {"name": name}, format="json")
            team_ids.append(response.data["id"])

        proposal_ids = []
        for team_id in team_ids:
            response = self.client.post(
                f"/api/v1/tasks/{task_id}/proposals/",
                {
                    "team": team_id,
                    "idea": "Идея решения.",
                    "plan": "План исследования и прототипирования.",
                    "timeline": "2 недели",
                },
                format="json",
            )
            proposal_ids.append(response.data["id"])

        for proposal_id in proposal_ids[:2]:
            response = self.client.post(
                f"/api/v1/proposals/{proposal_id}/decision/",
                {"decision": "accepted"},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.post(
            f"/api/v1/proposals/{proposal_ids[2]}/decision/",
            {"decision": "rejected"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            list(Proposal.objects.filter(task_id=task_id).values_list("status", flat=True)),
            ["rejected", "accepted", "accepted"],
        )
        self.assertEqual(BusinessTask.objects.get(id=task_id).status, BusinessTask.Status.PUBLISHED)

    def test_draft_task_does_not_accept_proposals(self):
        create_response = self.client.post("/api/v1/tasks/", self.task_payload, format="json")
        task_id = create_response.data["id"]
        team_response = self.client.post("/api/v1/teams/", {"name": "DraftTeam"}, format="json")

        response = self.client.post(
            f"/api/v1/tasks/{task_id}/proposals/",
            {
                "team": team_response.data["id"],
                "idea": "Идея.",
                "plan": "План.",
                "timeline": "1 неделя",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DemoDataCommandTests(TestCase):
    def test_seed_demo_is_idempotent_and_creates_required_dataset(self):
        call_command("seed_demo", verbosity=0)
        call_command("seed_demo", verbosity=0)

        self.assertEqual(BusinessTask.objects.count(), 5)
        self.assertEqual(TeamProfile.objects.count(), 5)
        self.assertEqual(Proposal.objects.count(), 5)
        self.assertEqual(BusinessTask.objects.filter(status=BusinessTask.Status.PUBLISHED).count(), 5)
