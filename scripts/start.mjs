import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const windows = process.platform === 'win32';
const venvPython = join(root, '.venv', windows ? 'Scripts/python.exe' : 'bin/python');
const python = process.env.PYTHON || (existsSync(venvPython) ? venvPython : 'python');
const vite = join(root, 'node_modules/vite/bin/vite.js');
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
function run(binary, args, name) {
  const child = spawn(binary, args, { cwd: root, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', (error) => {
    console.error(`${name}: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`${name} stopped (${code}).`);
      stop(code || 0);
    }
  });
}
async function probe(url, validate) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1800) });
    return response.ok && (await validate(response));
  } catch {
    return false;
  }
}
const backendReady = () =>
  probe(
    'http://127.0.0.1:8000/api/v1/health/',
    async (response) => (await response.json()).service === 'hackalem-ai-backend',
  );
const frontendReady = () =>
  probe('http://127.0.0.1:5173/', async (response) =>
    (await response.text()).includes('/src/main.tsx'),
  );
const [backendRunning, frontendRunning] = await Promise.all([backendReady(), frontendReady()]);
if (!frontendRunning && !existsSync(vite)) {
  console.error(
    'Dependencies are missing. Follow the setup in docs/FRONTEND.md, then run npm start.',
  );
  process.exitCode = 1;
} else {
  if (!backendRunning)
    run(python, ['manage.py', 'runserver', '127.0.0.1:8000', '--noreload'], 'Django');
  if (!frontendRunning) run(process.execPath, [vite, '--host', '127.0.0.1'], 'Vite');
  for (let attempt = 0; attempt < 30 && !stopping; attempt++) {
    if ((await backendReady()) && (await frontendReady())) {
      console.log(
        '\nSauron is ready: http://127.0.0.1:5173\nAPI: http://127.0.0.1:8000/api/v1/\nCtrl+C stops servers started by this launcher.\n',
      );
      if (process.argv.includes('--open')) {
        const opener = windows
          ? ['cmd.exe', ['/c', 'start', '', 'http://127.0.0.1:5173']]
          : process.platform === 'darwin'
            ? ['open', ['http://127.0.0.1:5173']]
            : ['xdg-open', ['http://127.0.0.1:5173']];
        const browser = spawn(opener[0], opener[1], { stdio: 'ignore', windowsHide: true });
        browser.on('error', () => console.log('Open http://127.0.0.1:5173 in your browser.'));
      }
      break;
    }
    if (attempt === 29) {
      console.error('Startup timed out. Check ports 8000 and 5173 and the messages above.');
      stop(1);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
