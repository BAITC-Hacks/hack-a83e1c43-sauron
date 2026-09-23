import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export default function cleanup() {
  if (process.env.SAURON_TEST_DATABASE === '1') return;
  const python = join(
    process.cwd(),
    '.venv',
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
  );
  if (existsSync('artifacts/e2e-created.json')) {
    if (!existsSync(python))
      throw new Error('E2E cleanup requires the project .venv. See docs/FRONTEND.md.');
    execFileSync(python, ['scripts/cleanup-e2e.py'], { stdio: 'inherit' });
  }
}
