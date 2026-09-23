from django.db import migrations, models


def identify_existing_demo(apps, schema_editor):
    Task = apps.get_model("challenges", "BusinessTask")
    Team = apps.get_model("challenges", "TeamProfile")
    Proposal = apps.get_model("challenges", "Proposal")
    drafts = [
        "Помочь кураторам вовремя поддерживать студентов.",
        "Пекарне нужно лучше планировать выпечку.",
        "Нужно быстрее разбирать обращения клиентов.",
        "Нужно улучшить планирование маршрутов доставки.",
        "Компании нужен понятный экологический отчёт.",
    ]
    teams = [
        ("EdTech", "Data analysis, UX", "Python, Django"),
        ("Analytics", "Data science, dashboards", "Python, pandas"),
        ("Smart city", "Product design, mapping", "React, GIS"),
        ("Sustainability", "Automation, reporting", "Python, PostgreSQL"),
        ("Applied AI", "NLP, prototyping", "Python, FastAPI"),
    ]
    for index, (draft, (interests, skills, technologies)) in enumerate(zip(drafts, teams), 1):
        task = Task.objects.filter(draft_text=draft, demo_key__isnull=True).order_by("pk").first()
        team = Team.objects.filter(interests=interests, skills=skills, technologies=technologies, demo_key__isnull=True).order_by("pk").first()
        if task:
            Task.objects.filter(pk=task.pk).update(demo_key=f"task-{index}")
        if team:
            Team.objects.filter(pk=team.pk).update(demo_key=f"team-{index}")
        if task and team:
            proposal = Proposal.objects.filter(
                task=task, team=team, demo_key__isnull=True,
                prototype_url=f"https://example.com/hackalem-demo-{index}",
            ).order_by("pk").first()
            if proposal:
                # Убираем только старую демонстрационную ссылку-заглушку.
                Proposal.objects.filter(pk=proposal.pk).update(demo_key=f"proposal-{index}", prototype_url="")


class Migration(migrations.Migration):
    dependencies = [("challenges", "0001_initial")]
    operations = [
        migrations.AddField(
            model_name=name, name="demo_key",
            field=models.CharField(blank=True, editable=False, max_length=40, null=True, unique=True),
        )
        for name in ("businesstask", "teamprofile", "proposal")
    ] + [migrations.RunPython(identify_existing_demo, migrations.RunPython.noop)]
