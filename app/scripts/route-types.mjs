// Erzeugt die typisierten Routen (.expo/types/router.d.ts) frisch.
//
// Warum: Ein laufender Entwicklungsserver schreibt die Datei bei Änderungen außerhalb von
// src/app teils fehlerhaft (z. B. „/../state/favorites“, „/favoriten/index“). Dann scheitert
// die Typprüfung, obwohl der Code stimmt. Dieses Skript startet Expo kurz auf einem freien
// Port, wartet, bis die Datei neu geschrieben ist, und beendet den Prozess sofort wieder.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const typesFile = path.join(appDir, '.expo', 'types', 'router.d.ts');
const TIMEOUT_MS = 120_000;

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function isClean() {
  if (!existsSync(typesFile)) return false;
  const text = readFileSync(typesFile, 'utf8');
  return text.includes('pathname') && !text.includes('/../');
}

function killTree(child) {
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }
}

const port = await freePort();
const before = existsSync(typesFile) ? statSync(typesFile).mtimeMs : 0;
rmSync(typesFile, { force: true });

const child = spawn('npx', ['expo', 'start', '--port', String(port)], {
  cwd: appDir,
  env: { ...process.env, CI: '1' },
  stdio: 'ignore',
  shell: process.platform === 'win32',
  detached: process.platform !== 'win32',
});

const start = Date.now();
let ok = false;
while (Date.now() - start < TIMEOUT_MS) {
  await new Promise((r) => setTimeout(r, 1000));
  if (isClean() && statSync(typesFile).mtimeMs > before) {
    ok = true;
    break;
  }
}
killTree(child);

if (!ok) {
  console.error('Routen-Typen konnten nicht erzeugt werden (Zeitüberschreitung).');
  process.exit(1);
}
console.log('Routen-Typen neu erzeugt.');
