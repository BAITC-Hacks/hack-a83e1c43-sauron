"""Transparent readiness scoring for a business task."""


SCORING_RULES = (
    {
        "key": "context_and_need",
        "label": "Контекст и потребность",
        "max_points": 20,
        "fields": ("context", "need"),
    },
    {
        "key": "data",
        "label": "Данные и материалы",
        "max_points": 20,
        "fields": ("data",),
    },
    {
        "key": "expected_result",
        "label": "Ожидаемый результат",
        "max_points": 15,
        "fields": ("expected_result",),
    },
    {
        "key": "success_criteria",
        "label": "Критерии успеха",
        "max_points": 15,
        "fields": ("success_criteria",),
    },
    {
        "key": "constraints",
        "label": "Ограничения",
        "max_points": 10,
        "fields": ("constraints",),
    },
    {
        "key": "users",
        "label": "Пользователи",
        "max_points": 10,
        "fields": ("users",),
    },
    {
        "key": "business_connection",
        "label": "Связь с бизнесом",
        "max_points": 10,
        "fields": ("business_contact", "interaction_format"),
    },
)


def has_value(value) -> bool:
    if not isinstance(value, str):
        return False
    text = value.strip().casefold().strip(".!? ")
    if text in {"test", "тест", "todo", "tbd", "asdf", "qwerty", "не знаю", "уточняется", "позже", "n/a"}:
        return False
    letters = [char for char in text if char.isalnum()]
    return len(letters) >= 3 and len(set(letters)) >= 2


def readiness_level(score: int) -> str:
    if score >= 90:
        return "priority"
    if score >= 70:
        return "ready"
    if score >= 40:
        return "working"
    return "draft"


def readiness_label(level: str) -> str:
    return {
        "draft": "Черновик",
        "working": "Рабочая",
        "ready": "Готовая",
        "priority": "Приоритетная",
    }.get(level, "Черновик")


def calculate_readiness(values: dict) -> dict:
    breakdown = []
    total = 0

    for rule in SCORING_RULES:
        filled = [has_value(values.get(field)) for field in rule["fields"]]
        if all(filled):
            points = rule["max_points"]
        elif any(filled):
            points = rule["max_points"] // 2
        else:
            points = 0

        missing = [field for field, is_filled in zip(rule["fields"], filled) if not is_filled]
        total += points
        breakdown.append(
            {
                "key": rule["key"],
                "label": rule["label"],
                "points": points,
                "max_points": rule["max_points"],
                "complete": not missing,
                "missing_fields": missing,
            }
        )

    level = readiness_level(total)
    return {
        "score": total,
        "level": level,
        "level_label": readiness_label(level),
        "quality_warnings": [
            field for rule in SCORING_RULES for field in rule["fields"]
            if values.get(field) and str(values[field]).strip() and not has_value(values[field])
        ],
        "breakdown": breakdown,
        "missing_fields": [
            field
            for item in breakdown
            for field in item["missing_fields"]
        ],
    }
