export const ESTADOS_RESULTADO = Object.freeze([
  'PASS', 'FAIL', 'BLOCKED', 'NOT_IMPLEMENTED', 'NOT_APPLICABLE',
]);

export const NIVELES_PRUEBA = Object.freeze([
  'DOMINIO_CON_DOBLES',
  'CONTRATO_PARAMETRIZADO',
  'INTEGRACION_MOTOR',
  'API_CON_IDENTIDAD',
  'UI_API_BD',
  'INSTALACION_RESTAURACION',
]);

const noVacio = (v) => typeof v === 'string' && v.trim().length > 0;

/** Crea un resultado portable sin convertir escenarios ausentes en PASS. */
export function crearResultado({
  escenario,
  nivel,
  estado,
  esperado,
  observado,
  evidencia,
  justificacion,
}) {
  if (!noVacio(escenario)) throw new TypeError('escenario es obligatorio');
  if (!NIVELES_PRUEBA.includes(nivel)) throw new TypeError('nivel de prueba desconocido');
  if (!ESTADOS_RESULTADO.includes(estado)) throw new TypeError('estado de resultado desconocido');

  const ejecutado = estado === 'PASS' || estado === 'FAIL';
  if (ejecutado) {
    if (esperado === undefined || observado === undefined) {
      throw new TypeError(`${estado} requiere esperado y observado`);
    }
    if (!noVacio(evidencia)) throw new TypeError(`${estado} requiere evidencia portable`);
  } else if (!noVacio(justificacion)) {
    throw new TypeError(`${estado} requiere una justificación`);
  }

  return Object.freeze({
    version: 1,
    escenario: escenario.trim(),
    nivel,
    estado,
    ...(ejecutado ? { esperado, observado, evidencia: evidencia.trim() } : { justificacion: justificacion.trim() }),
  });
}
