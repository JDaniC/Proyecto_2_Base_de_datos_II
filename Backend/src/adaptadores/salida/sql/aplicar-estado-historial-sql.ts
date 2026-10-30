import type { CambioPlanificado } from '../../../aplicacion/puertos/nucleo.js';
import type { Paciente } from '../../../dominio/clinica/paciente.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { DialectoSql, EjecutorSql } from './tipos-sql.js';
import { placeholder } from './tipos-sql.js';
import { fechaDb } from './mapear-clinica-sql.js';

export async function aplicarEstadoHistorialSql(executor: EjecutorSql, dialecto: DialectoSql, cambio: CambioPlanificado) {
  const actual = cambio.nuevoEstado as Paciente;
  if (cambio.tipo !== 'archivar' || actual.estado !== 'ARCHIVADO' || !actual.baja || actual.version !== Number(cambio.versionAnterior) + 1) throw new ErrorDominio('ESTADO_INVALIDO', 'Cambio de historial incompatible.');
  const p = (i: number) => placeholder(dialecto, i);
  const fila = await executor.consultar<{id_paciente: number | string; revision: number | string}>(
    `SELECT id_paciente, revision FROM paciente WHERE id_publico = ${p(1)} FOR UPDATE`, [cambio.recursoId]);
  if (!fila.filas[0] || Number(fila.filas[0].revision) !== cambio.versionAnterior) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El paciente cambió.');
  const id = fila.filas[0].id_paciente;
  const columna = dialecto === 'postgresql' ? 'estado_historial' : 'estado';
  await executor.consultar(`UPDATE historial_clinico SET ${columna} = 'ARCHIVADO', causa_baja = ${p(1)}, motivo_baja = ${p(2)}, fecha_baja = ${p(3)}, actor_baja = ${p(4)}, revision = revision + 1 WHERE id_paciente = ${p(5)}`,
    [actual.baja.causa, actual.baja.motivo, fechaDb(actual.baja.fecha), actual.baja.actorId, id]);
  await executor.consultar(`UPDATE paciente SET revision = ${p(1)}${dialecto === 'mysql' ? ", estado = 'INACTIVO'" : ''} WHERE id_paciente = ${p(2)}`, [actual.version, id]);
}
