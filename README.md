# HackAlem AI Backend

Backend MVP для каталога бизнес-задач AI Sana.

## Что реализовано

- создание и редактирование бизнес-задачи;
- AI-анализ черновика и генерация уточняющих вопросов;
- прозрачный рейтинг готовности от 0 до 100;
- ручное подтверждение перед публикацией;
- каталог опубликованных задач с фильтрами;
- профили студенческих команд;
- отклики команд и ручной выбор бизнеса.

## Быстрый запуск на SQLite

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Для демонстрации сквозного сценария с синтетическими данными:

```powershell
python manage.py seed_demo
```

Команда идемпотентна и создаёт 5 опубликованных задач, 5 профилей команд и 5 откликов. Бизнес может принять один, несколько или ни одного отклика — автоматического назначения команды нет.

Проверка: `GET http://127.0.0.1:8000/api/v1/health/`.

## PostgreSQL

```powershell
docker compose up -d db
$env:DATABASE_URL = "postgresql://hackalem:hackalem@localhost:5432/hackalem"
python manage.py migrate
python manage.py runserver
```

## Основные endpoints

- `POST /api/v1/tasks/analyze/` — анализ черновика и уточняющие вопросы;
- `POST /api/v1/tasks/` — создание задачи;
- `PATCH /api/v1/tasks/{id}/` — редактирование и пересчёт рейтинга;
- `POST /api/v1/tasks/{id}/publish/` — публикация после `{"confirmed": true}`;
- `GET /api/v1/tasks/` — каталог опубликованных задач;
- `POST /api/v1/tasks/{id}/proposals/` — отклик команды;
- `POST /api/v1/proposals/{id}/decision/` — решение бизнеса: `accepted` или `rejected`;
- `GET /api/v1/teams/` и `POST /api/v1/teams/` — профили команд.

Тесты: `python manage.py test`.

По умолчанию AI работает в режиме `mock`, поэтому MVP запускается без API-ключа. Для OpenAI задайте `AI_PROVIDER=openai` и `OPENAI_API_KEY` через переменные окружения. Ключ нельзя коммитить в репозиторий.
