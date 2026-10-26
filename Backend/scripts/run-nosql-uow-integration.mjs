import { execFile as ejecutarArchivo } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(ejecutarArchivo);

const backend = resolve(fileURLToPath(new URL('..', import.meta.url)));
const root = resolve(backend, '..');
const proyecto = `bdii-e01-p2-02-${randomBytes(4).toString('hex')}`;
const temporal = await mkdtemp(join(tmpdir(), 'bdii-nosql-uow-'));
const secretos = join(temporal, 'secrets');
const mongoPort = await puertoLibre();

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

const entorno = {
  ...process.env,
  DB_SECRETS_DIR: secretos,
  MONGO_PORT: mongoPort,
  ...(javaHomeEncontrado ? {
    JAVA_HOME: javaHomeEncontrado,
    PATH: `${join(javaHomeEncontrado, 'bin')}:${process.env.PATH ?? ''}`,
  } : {}),
};

const compose = ['compose', '-f', join(root, 'compose.yaml'), '-p', proyecto];
let levantado = false;

try {
  await comando('python3', [join(root, 'Database/docker/preparar.py'), '--secrets-dir', secretos], { cwd: root });
  await comando('docker', [...compose, 'config', '--quiet'], { cwd: root, env: entorno });
  levantado = true;
  await comando('docker', [...compose, 'up', '-d', '--build', '--wait', '--wait-timeout', '240', 'mongodb'], {
    cwd: root, env: entorno, timeout: 300_000,
  });
  await comando('docker', [...compose, 'run', '--rm', '--no-deps', 'mongo-init'], {
    cwd: root, env: entorno, timeout: 120_000,
  });

  entorno.MONGO_TEST_PORT = mongoPort;
  entorno.MONGO_TEST_SECRET_FILE = join(secretos, 'mongo_app_password');

  await comando('npm', ['run', 'build:test'], { cwd: backend });

  const confOriginal = JSON.parse(await readFile(join(root, 'Database/firebase/firebase.json'), 'utf8'));
  confOriginal.firestore.rules = join(root, 'Database/firebase/firestore.rules');
  confOriginal.firestore.indexes = join(root, 'Database/firebase/firestore.indexes.json');
  for (const name of ['auth', 'firestore', 'hub', 'logging']) {
    if (confOriginal.emulators && confOriginal.emulators[name]) {
      confOriginal.emulators[name].port = Number(await puertoLibre());
    }
  }
  const configFirebase = join(temporal, 'firebase.json');
  await writeFile(configFirebase, JSON.stringify(confOriginal));

  const comandoPruebas = `${process.execPath} --test dist-test/tests/integracion/nosql-uow.test.js`;

  const salidaPruebas = await comando(
    'firebase',
    [
      'emulators:exec',
      '--only', 'auth,firestore',
      '--project', 'demo-bdii-pediatria',
      '--config', configFirebase,
      comandoPruebas,
    ],
    { cwd: backend, env: entorno, timeout: 180_000 },
  );

  process.stdout.write(`${salidaPruebas}\n`);
} finally {
  try {
    if (levantado) {
      await comando('docker', [...compose, 'down', '--volumes', '--timeout', '30'], {
        cwd: root, env: entorno, timeout: 60_000,
      });
    }
  } finally {
    await rm(temporal, { recursive: true, force: true });
  }
}

async function puertoLibre() {
  const servidor = createServer();
  await new Promise((resolveListen, reject) => {
    servidor.once('error', reject);
    servidor.listen(0, '127.0.0.1', resolveListen);
  });
  const address = servidor.address();
  if (address === null || typeof address === 'string') throw new Error('NO_SE_PUDO_RESERVAR_PUERTO');
  const port = String(address.port);
  await new Promise((resolveClose, reject) => servidor.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

async function comando(programa, argumentos, opciones = {}) {
  try {
    const resultado = await execFile(programa, argumentos, {
      cwd: opciones.cwd,
      env: opciones.env ?? process.env,
      timeout: opciones.timeout ?? 30_000,
      maxBuffer: 8 * 1024 * 1024,
      encoding: 'utf8',
    });
    return resultado.stdout.trim();
  } catch (error) {
    const salidaError = typeof error === 'object' && error !== null && 'stderr' in error
      ? String(error.stderr || error.stdout || '').slice(-2500) : '';
    throw new Error(`${programa} falló${salidaError ? `: ${salidaError}` : ''}`);
  }
}
