import os
import subprocess
from pathlib import Path
from unittest import skipUnless
from unittest.mock import patch

from django.conf import settings
from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.core.management import call_command
from django.test import TestCase


@skipUnless((settings.BASE_DIR / "dist" / "index.html").exists(), "Run npm run build first")
class FrontendPageTests(TestCase):
    def test_home_serves_react_build_and_csrf_cookie(self):
        response = self.client.get("/")
        self.assertContains(response, 'id="root"')
        self.assertContains(response, "/static/ui/assets/")
        self.assertNotContains(response, "/static/hub/")
        self.assertIn("csrftoken", response.cookies)


@skipUnless(os.getenv("RUN_BROWSER_TESTS") == "1", "Set RUN_BROWSER_TESTS=1 to run browser journeys")
class FrontendBrowserTests(StaticLiveServerTestCase):
    @patch.dict(os.environ, {"AI_PROVIDER": "mock"})
    def test_frontenders_journeys_against_django(self):
        call_command("seed_demo", verbosity=0)
        env = {**os.environ, "SAURON_BASE_URL": self.live_server_url, "SAURON_TEST_DATABASE": "1"}
        result = subprocess.run(
            ["node", str(Path(settings.BASE_DIR) / "node_modules" / "@playwright" / "test" / "cli.js"), "test"],
            cwd=settings.BASE_DIR, env=env, text=True, encoding="utf-8", errors="replace",
            capture_output=True, timeout=240,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
