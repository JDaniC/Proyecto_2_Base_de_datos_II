import {execFile as execFileCallback} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';

const execFile = promisify(execFileCallback);
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const backend = join(root, 'Backend');
const proyecto = `bdii-e02-p2-01-${randomBytes(5).toString('hex')}`;
const temporal = await mkdtemp(join(tmpdir(), 'bdii-pacientes-mongo-'));
const secretos = join(temporal, 'secrets');
await mkdir(secretos);
const valores = {};
for (const name of ['postgres_admin_password', 'postgres_app_password', 'mysql_root_password', 'mysql_app_password', 'mongo_admin_password', 'mongo_app_password', 'mongo_keyfile']) {
  valores[name] = name === 'mongo_keyfile' ? randomBytes(512).toString('base64') : randomBytes(32).toString('hex');
  await writeFile(join(secretos, name), `${valores[name]}\n`, {mode: 0o600});
}
const listener = createServer();
await new Promise((ok, fail) => { listener.once('error', fail); listener.listen(0, '127.0.0.1', ok); });
const port = listener.address().port;
await new Promise((ok) => listener.close(ok));
const env = {...process.env, DB_SECRETS_DIR: secretos, MONGO_PORT: String(port)};
const compose = ['compose', '-f', join(root, 'compose.yaml'), '-p', proyecto];
const sanitize = (text) => Object.values(valores).reduce((s, secret) => s.replaceAll(secret, '[SECRETO]'), text);
async function run(command, args, options = {}) {
  try {
    const result = await execFile(command, args, {cwd: root, env, timeout: 240_000, maxBuffer: 8 * 1024 * 1024, ...options});
    return sanitize(result.stdout + result.stderr);
  } catch (error) {
    console.error(sanitize((error.stdout ?? '') + (error.stderr ?? '')));
    throw new Error(`Fallo en etapa ${command}; exit ${error.code ?? 'desconocido'}`);
  }
}
try {
  console.log('Preparando MongoDB aislado:', proyecto);
  await run('docker', [...compose, 'up', '-d', '--wait', '--wait-timeout', '180', 'mongodb']);
  console.log(await run('docker', [...compose, 'run', '--rm', '--no-deps', 'mongo-init']));
  await run(process.execPath, [join(backend, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.test.json'], {cwd: backend});
  await run(process.execPath, ['scripts/copiar-contrato.mjs', 'dist-test/src'], {cwd: backend});
  const salida = await run(process.execPath, ['--test', 'dist-test/tests/integracion/pacientes-mongodb.test.js'], {
    cwd: backend, timeout: 180_000,
    env: {...env, MONGO_TEST_PORT: String(port), MONGO_TEST_SECRET_FILE: join(secretos, 'mongo_app_password'),
      MONGO_ADMIN_TEST_SECRET_FILE: join(secretos, 'mongo_admin_password'), MONGO_TEST_CONTAINER: `${proyecto}-mongodb-1`},
  });
  console.log(salida);
} finally {
  try { await run('docker', [...compose, 'down', '--volumes', '--timeout', '30']); }
  finally {
    // Solo el directorio generado por mkdtemp en esta invocación; nunca una ruta de usuario.
    const target = resolve(temporal);
    if (!target.startsWith(resolve(tmpdir()) + (process.platform === 'win32' ? '\\' : '/')) || !target.split(/[\\/]/).at(-1).startsWith('bdii-pacientes-mongo-')) throw new Error('RUTA_TEMPORAL_NO_SEGURA');
    await rm(target, {recursive: true, force: true});
  }
}
