import { pathToFileURL } from 'node:url';
import { crearDependenciasBackend, ErrorConfiguracionBackend } from '../dist/composicion/crear-dependencias-backend.js';
import { ProvisionarCuentaPendiente } from '../dist/aplicacion/casos-uso/cuentas/provisionar-cuenta-pendiente.js';
import { esInstitucion } from '../dist/dominio/compartido/institucion.js';
import { ErrorDominio } from '../dist/dominio/compartido/error-dominio.js';

export function parsearArgumentosProvision(argumentos) {
  if (!Array.isArray(argumentos) || argumentos.length !== 3 || argumentos[0] !== '--confirmar') {
    return null;
  }
  const [, institucion, uid] = argumentos;
  if (!esInstitucion(institucion) || typeof uid !== 'string' || uid.trim().length === 0) {
    return null;
  }
  return Object.freeze({ institucion, uid: uid.trim() });
}

export async function ejecutarProvision(args, entorno = process.env) {
  const entrada = parsearArgumentosProvision(args);
  if (!entrada) throw new Error('USO: npm run provision:cuenta -- --confirmar <INSTITUCION_CANONICA> <UID_FIREBASE_EXISTENTE>');
  if (entorno.APP_ENV !== 'delivery') throw new Error('PROVISION_REQUIERE_APP_ENV_DELIVERY');

  const dependencias = await crearDependenciasBackend(entorno);
  if (!dependencias) throw new Error('PROVISION_REQUIERE_PERSISTENCIA_CONFIGURADA');
  try {
    const provisionar = new ProvisionarCuentaPendiente(
      dependencias.administradorIdentidad,
      (institucion) => dependencias.bundles.find((bundle) => bundle.institucion === institucion),
    );
    const resultado = await provisionar.ejecutar(entrada);
    return Object.freeze({
      cuenta_id: resultado.cuenta_id,
      institucion: resultado.institucion,
      estado: resultado.estado,
      version: resultado.version,
    });
  } finally {
    await dependencias.cerrar();
  }
}

async function main() {
  try {
    const resultado = await ejecutarProvision(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(resultado)}\n`);
  } catch (error) {
    process.stderr.write(`${describirErrorSeguro(error)}\n`);
    process.exitCode = 1;
  }
}

function describirErrorSeguro(error) {
  if (error instanceof ErrorDominio) return error.codigo;
  if (error instanceof ErrorConfiguracionBackend) {
    return `${error.message}: ${error.variables.join(', ')}`;
  }
  if (error instanceof Error && /^(USO:|PROVISION_REQUIERE_)/.test(error.message)) {
    return error.message;
  }
  return 'PROVISION_FAILED';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
