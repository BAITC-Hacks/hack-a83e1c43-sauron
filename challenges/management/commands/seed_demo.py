from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from challenges.models import BusinessTask, Proposal, TeamProfile


TASKS = [
    {
        "title": "Панель риска отсева студентов",
        "industry": "education",
        "draft_text": "Помочь кураторам вовремя поддерживать студентов.",
        "context": "Кураторы видят проблемы студентов слишком поздно.",
        "need": "Нужно находить группы риска до отчисления.",
        "users": "Студенты первого курса и кураторы.",
        "data": "Посещаемость и результаты тестов.",
        "constraints": "Только обезличенные данные.",
        "expected_result": "Прототип панели для куратора.",
        "success_criteria": "Снижение отсева на 15 процентов.",
        "business_contact": "Куратор программы",
        "interaction_format": "Созвон раз в неделю",
    },
    {
        "title": "Прогноз спроса для пекарни",
        "industry": "retail",
        "draft_text": "Пекарне нужно лучше планировать выпечку.",
        "context": "Часть продукции остаётся непроданной вечером.",
        "need": "Нужно оценивать спрос на следующий день.",
        "users": "Управляющий пекарни.",
        "data": "Продажи по дням и часам.",
        "expected_result": "Простая таблица с прогнозом спроса.",
    },
    {
        "title": "Разбор обращений в сервисный центр",
        "industry": "services",
        "draft_text": "Нужно быстрее разбирать обращения клиентов.",
        "context": "Операторы вручную сортируют обращения.",
        "need": "Нужно находить повторяющиеся темы.",
        "users": "Операторы сервисного центра.",
    },
    {
        "title": "Оптимизация городских маршрутов",
        "industry": "logistics",
        "draft_text": "Нужно улучшить планирование маршрутов доставки.",
        "context": "Маршруты составляются по фиксированным правилам.",
        "need": "Нужно уменьшить холостой пробег.",
        "users": "Логисты и водители.",
        "data": "История доставок и координаты остановок.",
        "constraints": "Прототип без интеграции с навигатором.",
        "expected_result": "Модель рекомендаций маршрута.",
        "success_criteria": "Сокращение пробега на 10 процентов.",
    },
    {
        "title": "Помощник для экологического отчёта",
        "industry": "sustainability",
        "draft_text": "Компании нужен понятный экологический отчёт.",
        "context": "Данные о потреблении ресурсов находятся в разных таблицах.",
        "need": "Нужно собрать показатели в единый отчёт.",
        "users": "Специалист по устойчивому развитию.",
        "data": "Таблицы потребления воды и электроэнергии.",
        "constraints": "Без передачи данных во внешние сервисы.",
        "expected_result": "Редактируемый макет отчёта.",
        "success_criteria": "Подготовка отчёта занимает не более часа.",
        "business_contact": "ESG-менеджер",
        "interaction_format": "Онлайн-встреча два раза в неделю",
    },
]


TEAMS = [
    {
        "name": "EduMinds",
        "interests": "EdTech",
        "skills": "Data analysis, UX",
        "technologies": "Python, Django",
    },
    {
        "name": "DataCraft",
        "interests": "Analytics",
        "skills": "Data science, dashboards",
        "technologies": "Python, pandas",
    },
    {
        "name": "CivicFlow",
        "interests": "Smart city",
        "skills": "Product design, mapping",
        "technologies": "React, GIS",
    },
    {
        "name": "GreenByte",
        "interests": "Sustainability",
        "skills": "Automation, reporting",
        "technologies": "Python, PostgreSQL",
    },
    {
        "name": "VisionLab",
        "interests": "Applied AI",
        "skills": "NLP, prototyping",
        "technologies": "Python, FastAPI",
    },
]


PROPOSALS = [
    {"idea": "Панель ранних сигналов для куратора: посещаемость, результаты тестов и объяснение риска.",
     "plan": "Согласовать обезличенный набор, построить базовые правила, проверить на исторических примерах и показать панель.", "timeline": "2 недели"},
    {"idea": "Прогноз выпечки по дням недели с понятным диапазоном спроса.",
     "plan": "Проверить историю продаж, сравнить прогноз со средним за прошлые недели, выгрузить план выпечки в таблицу.", "timeline": "10 дней"},
    {"idea": "Помощник оператора предлагает категорию обращения, решение подтверждает сотрудник.",
     "plan": "Собрать примеры категорий, подготовить правила и прототип, проверить ошибки на отдельной выборке.", "timeline": "2 недели"},
    {"idea": "Сравнение текущего маршрута доставки с вариантом, учитывающим расстояния и временные окна.",
     "plan": "Проверить координаты, реализовать базовый алгоритм, сравнить километраж и показать маршруты на карте.", "timeline": "3 недели"},
    {"idea": "Сборщик экологического отчёта из таблиц с проверкой единиц измерения и пропусков.",
     "plan": "Согласовать формат таблиц, добавить проверки, собрать редактируемый отчёт и замерить время подготовки.", "timeline": "12 дней"},
]


class Command(BaseCommand):
    help = "Создаёт 5 синтетических задач, команд и откликов для демонстрации MVP."

    @transaction.atomic
    def handle(self, *args, **options):
        now = timezone.now()
        tasks = []
        created_count = 0
        for index, data in enumerate(TASKS, 1):
            task_data = {**data, "status": BusinessTask.Status.PUBLISHED, "published_at": now}
            task, created = BusinessTask.objects.get_or_create(
                demo_key=f"task-{index}",
                defaults=task_data,
            )
            created_count += created
            tasks.append(task)

        teams = []
        for index, data in enumerate(TEAMS, 1):
            team, created = TeamProfile.objects.get_or_create(
                demo_key=f"team-{index}",
                defaults=data,
            )
            created_count += created
            teams.append(team)

        for index, (task, team, data) in enumerate(zip(tasks, teams, PROPOSALS), 1):
            _, created = Proposal.objects.get_or_create(
                demo_key=f"proposal-{index}",
                defaults={"task": task, "team": team, **data},
            )
            created_count += created

        self.stdout.write(
            self.style.SUCCESS(
                f"Демо-набор готов: добавлено записей — {created_count}. "
                "Существующие карточки, профили и решения не изменены."
            )
        )
