import type { ContextoAutenticado } from '../../../aplicacion/puertos/contexto-autenticado.js';
import type { CambioPlanificado, ComandoEstable } from '../../../aplicacion/puertos/nucleo.js';
import type { Consulta } from '../../../dominio/clinica/consulta.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { idClinicoEstable, fechaDb, objetoJson } from './mapear-clinica-sql.js';
import { placeholder, type DialectoSql, type EjecutorSql } from './tipos-sql.js';

/** La fila mantiene el puntero de versión y el snapshot corregido. Los componentes emitidos originales son historia inmutable. */
export async function corregirConsultaSql(e: EjecutorSql, motor: DialectoSql, contexto: ContextoAutenticado, comando: ComandoEstable, cambio: CambioPlanificado) {
  const c = cambio.nuevoEstado as Consulta;
  const tabla = motor === 'postgresql' ? 'consulta' : 'consulta_odontologica';
  const p = (i: number) => placeholder(motor, i);
  const filas = await e.consultar<Record<string, unknown>>(`SELECT * FROM ${tabla} WHERE id_publico = ${p(1)} FOR UPDATE`, [c.id]);
  const anterior = filas.filas[0];
  if (!anterior || Number(anterior.revision) !== cambio.versionAnterior || anterior.estado !== 'FINALIZADA' || c.estado !== 'FINALIZADA') throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La consulta cambió.');
  if (motor === 'postgresql') {
    // El trigger físico exige además la fila anterior completa, independiente de la revisión canónica de aplicación.
    await e.consultar(`INSERT INTO revisiones (id_revision, tipo_recurso, recurso_id, version, id_usuario, fecha_hora, motivo, contenido_anterior)
      SELECT $1, 'consulta', $2, $3, id_usuario, $4::timestamp, 'consulta.corregir', to_jsonb(c) FROM consulta c, usuario u WHERE c.id_publico=$2 AND u.id_publico=$5`,
      [idClinicoEstable(comando.id, 'revision-fisica-consulta'), c.id, cambio.versionAnterior, fechaDb(comando.instante), contexto.cuenta.id]);
  }
  await e.consultar(`UPDATE ${tabla} SET revision=${p(1)}, snapshot_actual=${p(2)}${motor === 'postgresql' ? '::jsonb' : ''} WHERE id_publico=${p(3)} AND revision=${p(4)}`,
    [c.version, JSON.stringify(c), c.id, cambio.versionAnterior]);
}

export function consultaCorregidaSql(snapshot: unknown, fila: {id_publico: string; revision: number | string; paciente_id: string}): Consulta | undefined {
  if (snapshot === null || snapshot === undefined) return undefined;
  const c = objetoJson(snapshot) as unknown as Consulta | null;
  if (!c || c.id !== fila.id_publico || c.version !== Number(fila.revision) || c.paciente_id !== fila.paciente_id || c.estado !== 'FINALIZADA' || !Array.isArray(c.diagnosticos) || !Array.isArray(c.tratamientos)) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La versión clínica requiere reconciliación.');
  return c;
}
