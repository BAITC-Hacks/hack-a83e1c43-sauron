"""AI adapter for task clarification.

The deterministic provider keeps the MVP usable without an API key. When
OPENAI_API_KEY is configured, the same interface can use OpenAI and falls
back safely if the provider returns invalid data.
"""

import json
import os


FALLBACK_QUESTIONS = [
    {
        "field": "users",
        "question": "Кто конкретно будет пользоваться будущим решением?",
    },
    {
        "field": "data",
        "question": "Какие данные, примеры или материалы уже доступны команде?",
    },
    {
        "field": "expected_result",
        "question": "Какой конкретный результат должна показать команда?",
    },
    {
        "field": "success_criteria",
        "question": "По каким измеримым признакам бизнес поймёт, что решение подходит?",
    },
    {
        "field": "constraints",
        "question": "Какие есть ограничения по срокам, технологиям, доступам или данным?",
    },
]


def _fallback_response(draft_text: str) -> dict:
    text = draft_text.strip()
    lower_text = text.lower()
    questions = list(FALLBACK_QUESTIONS)

    if "студент" in lower_text or "пользовател" in lower_text:
        questions[0] = {
            "field": "users",
            "question": "Какая именно группа пользователей является приоритетной?",
        }

    return {
        "provider": "mock",
        "draft_text": text,
        "questions": questions,
        "missing_fields": [item["field"] for item in questions],
    }


def _openai_response(draft_text: str) -> dict | None:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or os.getenv("AI_PROVIDER", "mock").lower() != "openai":
        return None

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            input=(
                "Ты помогаешь представителю бизнеса уточнить задачу для студентов. "
                "Не выдумывай факты. Верни только JSON с массивом questions из минимум "
                "трёх объектов {field, question} и массивом missing_fields. "
                f"Черновик задачи: {draft_text}"
            ),
        )
        payload = json.loads(response.output_text)
        questions = payload.get("questions", [])
        if not isinstance(questions, list) or len(questions) < 3:
            return None
        valid_questions = [
            item
            for item in questions
            if isinstance(item, dict) and item.get("field") and item.get("question")
        ]
        if len(valid_questions) < 3:
            return None
        return {
            "provider": "openai",
            "draft_text": draft_text.strip(),
            "questions": valid_questions,
            "missing_fields": payload.get("missing_fields", []),
        }
    except Exception:
        return None


def generate_clarifying_questions(draft_text: str) -> dict:
    if not draft_text or not draft_text.strip():
        raise ValueError("draft_text не должен быть пустым")
    return _openai_response(draft_text.strip()) or _fallback_response(draft_text)
