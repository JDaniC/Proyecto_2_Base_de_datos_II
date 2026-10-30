import { execFile as ejecutarArchivo } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(ejecutarArchivo);

const backend = resolve(fileURLToPath(new URL('..', import.meta.url)));
const root = resolve(backend, '..');
const proyecto = `bdii-e01-p2-01-${randomBytes(4).toString('hex')}`;
const temporal = await mkdtemp(join(tmpdir(), 'bdii-sql-uow-'));
const secretos = join(temporal, 'secrets');
const entorno = {
  ...process.env,
  DB_SECRETS_DIR: secretos,
  POSTGRES_PORT: await puertoLibre(),
  MYSQL_PORT: await puertoLibre(),
};
const compose = ['compose', '-f', join(root, 'compose.yaml'), '-p', proyecto];
let levantado = false;

try {
  await comando('python3', [join(root, 'Database/docker/preparar.py'), '--secrets-dir', secretos], { cwd: root });
  await comando('docker', [...compose, 'config', '--quiet'], { cwd: root, env: entorno });
  levantado = true;
  await comando('docker', [...compose, 'up', '-d', '--build', '--wait', '--wait-timeout', '240', 'postgres', 'mysql'], {
    cwd: root, env: entorno, timeout: 300_000,
  });
  for (const [servicio, archivo] of [
    ['postgres', '004_historial_postgresql.sql'],
    ['postgres', '007_correcciones_postgresql.sql'],
    ['mysql', '004_historial_mysql.sql'],
    ['mysql', '007_correcciones_mysql.sql'],
  ]) {
    const destino = `${servicio}:/tmp/${archivo}`;
    await comando('docker', [...compose, 'cp', join(root, 'Database/migrations', archivo), destino], { cwd: root, env: entorno });
    const aplicar = servicio === 'postgres'
      ? ['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres_admin', '-d', 'hospital_general', '-f', `/tmp/${archivo}`]
      : ['sh', '-c', `MYSQL_PWD="$(cat /run/secrets/mysql_root_password)" mysql -uroot < /tmp/${archivo}`];
    await comando('docker', [...compose, 'exec', '-T', servicio, ...aplicar], { cwd: root, env: entorno, timeout: 120_000 });
  }
  entorno.PG_TEST_PORT = entorno.POSTGRES_PORT;
  entorno.PG_TEST_SECRET_FILE = join(secretos, 'postgres_app_password');
  entorno.MYSQL_TEST_PORT = entorno.MYSQL_PORT;
  entorno.MYSQL_TEST_SECRET_FILE = join(secretos, 'mysql_app_password');
  entorno.CURSOR_SIGNING_SECRET = 'super_secret_cursor_signing_key_test_2026';
  await comando('npm', ['run', 'build:test'], { cwd: backend });
  const salidaPruebas = await comando(process.execPath, [
    '--test',
    '--test-concurrency=1',
    'dist-test/tests/integracion/sql-uow.test.js',
    'dist-test/tests/integracion/pacientes-sql.test.js',
    'dist-test/tests/integracion/clinica-sql.test.js',
  ], { cwd: backend, env: entorno });
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
