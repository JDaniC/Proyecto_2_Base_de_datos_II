import { randomBytes } from 'node:crypto';

const MOTORES = new Set(['postgresql', 'mysql', 'mongodb', 'firestore']);
const HOSTS_LOCALES = new Set(['127.0.0.1', 'localhost', '::1']);
const ID_EJECUCION = /^[a-f0-9]{32}$/i;

function destinoInseguro(motivo) {
  const error = new Error(`Destino de pruebas no aislado: ${motivo}`);
  error.code = 'DESTINO_PRUEBAS_NO_AISLADO';
  return error;
}

/**
 * Valida la configuración de infraestructura antes de invocar un driver.
 * Esta función pertenece al arnés de pruebas; el dominio no recibe el motor.
 */
export function validarDestinoAislado(destino, entorno = process.env) {
  if (!destino || typeof destino !== 'object' || Array.isArray(destino)) {
    throw destinoInseguro('falta la descripción del destino');
  }
  if (entorno?.NODE_ENV !== 'test' || entorno?.BDII_TEST_ISOLATED !== '1') {
    throw destinoInseguro('se requiere NODE_ENV=test y BDII_TEST_ISOLATED=1');
  }

  const motor = typeof destino.motor === 'string' ? destino.motor.toLowerCase() : '';
  const host = typeof destino.host === 'string' ? destino.host.toLowerCase() : '';
  const puerto = destino.puerto;
  const runId = typeof destino.runId === 'string' ? destino.runId.toLowerCase() : '';

  if (!MOTORES.has(motor)) throw destinoInseguro('motor desconocido');
  if (!HOSTS_LOCALES.has(host)) throw destinoInseguro('el host no es loopback');
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) {
    throw destinoInseguro('puerto inválido');
  }
  if (!ID_EJECUCION.test(runId)) throw destinoInseguro('runId debe ser un sufijo hexadecimal de treinta y dos caracteres');

  if (motor === 'firestore') {
    const projectId = typeof destino.projectId === 'string' ? destino.projectId : '';
    const proyectoEsperado = `demo-bdii-test-${runId}`;
    const emuladorEsperado = `${host}:${puerto}`;
    if (projectId !== proyectoEsperado) throw destinoInseguro('Firestore requiere un proyecto demo único por ejecución');
    if (entorno.FIRESTORE_EMULATOR_HOST !== emuladorEsperado) {
      throw destinoInseguro('FIRESTORE_EMULATOR_HOST debe coincidir con el emulador local');
    }
    return Object.freeze({ motor, host, puerto, projectId, runId });
  }

  const baseDatos = typeof destino.baseDatos === 'string' ? destino.baseDatos : '';
  if (baseDatos !== `bdii_test_${runId}`) {
    throw destinoInseguro('la base debe ser única y llevar el prefijo bdii_test_');
  }
  return Object.freeze({ motor, host, puerto, baseDatos, runId });
}

/** Genera un sufijo aleatorio para reutilizarlo durante una ejecución aislada. */
export function crearRunId() {
  return randomBytes(16).toString('hex');
}

/**
 * Ejecuta callbacks de prueba solo después de validar el destino. `limpiar`
 * recibe únicamente el recurso creado por `preparar` y se ejecuta aun si el
 * escenario falla. No configura ni conecta drivers por sí misma.
 */
export async function ejecutarEnDestinoAislado({ destino, entorno = process.env, preparar, ejecutar, limpiar }) {
  if (typeof preparar !== 'function' || typeof ejecutar !== 'function' || typeof limpiar !== 'function') {
    throw new TypeError('preparar, ejecutar y limpiar deben ser funciones');
  }

  const destinoSeguro = validarDestinoAislado(destino, entorno);
  let recurso;
  let preparado = false;
  try {
    recurso = await preparar(destinoSeguro);
    preparado = true;
    return await ejecutar(recurso, destinoSeguro);
  } finally {
    if (preparado) await limpiar(recurso, destinoSeguro);
  }
}
