import { execFile as ejecutarArchivo } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(ejecutarArchivo);

const backend = resolve(fileURLToPath(new URL('..', import.meta.url)));
const root = resolve(backend, '..');
const temporal = await mkdtemp(join(tmpdir(), 'bdii-firestore-clinica-'));

const javaCandidatos = [
  process.env.JAVA_HOME,
  '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  '/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk/libexec/openjdk.jdk/Contents/Home',
  '/Applications/DBeaver.app/Contents/Eclipse/jre/Contents/Home',
  '/Applications/DataGrip.app/Contents/jbr/Contents/Home',
  '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
].filter(Boolean);

let javaHomeEncontrado = null;
for (const home of javaCandidatos) {
  if (home && existsSync(join(home, 'bin', 'java'))) {
    javaHomeEncontrado = home;
    break;
  }
}

function puertoLibre() {
  return new Promise((res, rej) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => res(String(p)));
    });
    s.on('error', rej);
  });
}

async function comando(cmd, args, opciones = {}) {
  const { stdout, stderr } = await execFile(cmd, args, opciones);
  return `${stdout ?? ''}${stderr ?? ''}`.trim();
}

const entorno = {
  ...process.env,
  CURSOR_SIGNING_SECRET: 'cursor-sintetico-clinica-firestore-aislado-2026',
  ...(javaHomeEncontrado
    ? {
        JAVA_HOME: javaHomeEncontrado,
        PATH: `${join(javaHomeEncontrado, 'bin')}:${process.env.PATH ?? ''}`,
      }
    : {}),
};

try {
  await comando('npm', ['run', 'build:test'], { cwd: backend });

  const confOriginal = JSON.parse(
    await readFile(join(root, 'Database/firebase/firebase.json'), 'utf8'),
  );
  confOriginal.firestore.rules = join(root, 'Database/firebase/firestore.rules');
  confOriginal.firestore.indexes = join(root, 'Database/firebase/firestore.indexes.json');

  for (const name of ['auth', 'firestore', 'hub', 'logging']) {
    if (confOriginal.emulators && confOriginal.emulators[name]) {
      confOriginal.emulators[name].port = Number(await puertoLibre());
    }
  }

  const configFirebase = join(temporal, 'firebase.json');
  await writeFile(configFirebase, JSON.stringify(confOriginal));

  const comandoPruebas = `${process.execPath} --test dist-test/tests/integracion/clinica-firestore.test.js`;

  const salidaPruebas = await comando(
    'firebase',
    [
      'emulators:exec',
      '--only',
      'auth,firestore',
      '--project',
      'demo-bdii-pediatria-clinica',
      '--config',
      configFirebase,
      comandoPruebas,
    ],
    { cwd: backend, env: entorno, timeout: 180_000 },
  );

  process.stdout.write(`${salidaPruebas}\n`);
} finally {
  await rm(temporal, { recursive: true, force: true }).catch(() => {});
}
