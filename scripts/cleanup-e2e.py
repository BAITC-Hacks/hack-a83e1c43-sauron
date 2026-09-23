"""Remove only records created by the local frontend E2E journey."""
import json
import os
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
manifest = root / 'artifacts' / 'e2e-created.json'
if not manifest.exists():
    sys.exit(0)
sys.path.insert(0, str(root))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.conf import settings
from challenges.models import BusinessTask, TeamProfile

database = settings.DATABASES['default']
if database['ENGINE'] != 'django.db.backends.sqlite3' or Path(database['NAME']).resolve() != (root / 'db.sqlite3').resolve():
    raise RuntimeError('Cleanup is restricted to this project’s local SQLite database.')
created = json.loads(manifest.read_text(encoding='utf-8-sig'))
if not created['title'].startswith('__SAURON_E2E_') or not created['teamName'].startswith('__SAURON_E2E_'):
    raise RuntimeError('Invalid E2E cleanup manifest.')
if created.get('taskId'):
    BusinessTask.objects.filter(id=created['taskId'], title=created['title']).delete()
if created.get('teamId'):
    TeamProfile.objects.filter(id=created['teamId'], name=created['teamName']).delete()
manifest.unlink()
print('Local E2E records removed.')
