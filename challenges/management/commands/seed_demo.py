from django.core.management.base import BaseCommand
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


class Command(BaseCommand):
    help = "Создаёт 5 синтетических задач, команд и откликов для демонстрации MVP."

    def handle(self, *args, **options):
        now = timezone.now()
        tasks = []
        for data in TASKS:
            task_data = {**data, "status": BusinessTask.Status.PUBLISHED, "published_at": now}
            task, _ = BusinessTask.objects.update_or_create(
                title=data["title"],
                defaults=task_data,
            )
            tasks.append(task)

        teams = []
        for data in TEAMS:
            team, _ = TeamProfile.objects.update_or_create(
                name=data["name"],
                defaults=data,
            )
            teams.append(team)

        for index, (task, team) in enumerate(zip(tasks, teams)):
            Proposal.objects.update_or_create(
                task=task,
                team=team,
                defaults={
                    "idea": f"Прототип решения для задачи «{task.title}».",
                    "plan": "Исследование данных, быстрый прототип и демонстрация бизнесу.",
                    "timeline": "2 недели",
                    "prototype_url": f"https://example.com/hackalem-demo-{index + 1}",
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                "Создано/обновлено: 5 задач, 5 команд и 5 откликов. "
                "Все задачи опубликованы и доступны в каталоге."
            )
        )
