import { createHash } from 'node:crypto';
import type { CambioPlanificado, ComandoEstable } from '../../../../aplicacion/puertos/nucleo.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { derivarClaveIdentificacion } from '../../../../dominio/compartido/normalizacion.js';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import type {
  ArchivoRegistrado,
  Identificacion,
  Paciente,
} from '../../../../dominio/clinica/paciente.js';
import type { EjecutorSql } from '../../sql/tipos-sql.js';

export async function aplicarCambiosPacientesMysql(
  executor: EjecutorSql,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
  cambios: readonly CambioPlanificado[],
): Promise<void> {
  for (const cambio of cambios) {
    if (cambio.agregado === 'pacientes') {
      if (cambio.tipo === 'CREAR') {
        const pac = cambio.nuevoEstado as Paciente;
        await executor.consultar(
          `INSERT INTO paciente (
            id_publico, revision, nombres, apellidos,
            fecha_nacimiento, sexo, telefono, correo, direccion, estado
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
          [
            pac.id,
            pac.version,
            pac.nombres,
            pac.apellidos,
            pac.fechaNacimiento,
            pac.sexo,
            pac.telefono ?? null,
            pac.correo ?? null,
            pac.direccion ?? null,
          ],
        );

        const resId = await executor.consultar<{ id_paciente: number | string }>(
          'SELECT id_paciente FROM paciente WHERE id_publico = ?',
          [pac.id],
        );
        const idPaciente = resId.filas[0]?.id_paciente;
        if (idPaciente === undefined) {
          throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudo obtener el identificador interno del paciente.');
        }

        await executor.consultar(
          `INSERT INTO historial_clinico (
            id_publico, revision, id_paciente, fecha_apertura, estado
          ) VALUES (UUID(), 1, ?, CURRENT_DATE, 'ACTIVO')`,
          [idPaciente],
        );
      } else if (cambio.tipo === 'MODIFICAR' || cambio.tipo === 'ACTUALIZAR') {
        const pac = cambio.nuevoEstado as Paciente;
        const nuevoEstadoPaciente = pac.estado === 'ARCHIVADO' ? 'INACTIVO' : 'ACTIVO';
        const resPrevio = await executor.consultar<{ id_paciente: number | string; revision: number | string }>(
          'SELECT id_paciente, revision FROM paciente WHERE id_publico = ? FOR UPDATE',
          [pac.id],
        );
        const filaPrevia = resPrevio.filas[0];
        if (!filaPrevia) {
          throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'No se encontró el paciente para actualizar.');
        }
        if (Number(filaPrevia.revision) !== cambio.versionAnterior) {
          throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El paciente ha sido modificado por otro proceso.');
        }
        await executor.consultar(
          `UPDATE paciente SET
            revision = ?,
            nombres = ?,
            apellidos = ?,
            fecha_nacimiento = ?,
            sexo = ?,
            telefono = ?,
            correo = ?,
            direccion = ?,
            estado = ?
          WHERE id_publico = ?`,
          [
            pac.version,
            pac.nombres,
            pac.apellidos,
            pac.fechaNacimiento,
            pac.sexo,
            pac.telefono ?? null,
            pac.correo ?? null,
            pac.direccion ?? null,
            nuevoEstadoPaciente,
            pac.id,
          ],
        );
      }
    } else if (cambio.agregado === 'identidades') {
      const estado = cambio.nuevoEstado as { identificacion: Identificacion; titularId?: UUID };
      const clave = createHash('sha256')
        .update(derivarClaveIdentificacion(estado.identificacion.tipo, estado.identificacion.numero))
        .digest('hex');

      if (cambio.tipo === 'RESERVAR') {
        const titularId = estado.titularId ?? (cambio.recursoId as UUID);
        const resId = await executor.consultar<{ id_paciente: number | string }>(
          'SELECT id_paciente FROM paciente WHERE id_publico = ?',
          [titularId],
        );
        const idPaciente = resId.filas[0]?.id_paciente;
        if (idPaciente === undefined) {
          throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se encontró el paciente para asociar la identidad.');
        }

        await executor.consultar(
          `INSERT INTO identidades_paciente (clave, tipo_documento, numero_documento, id_paciente)
          VALUES (?, ?, ?, ?)`,
          [clave, estado.identificacion.tipo, estado.identificacion.numero, idPaciente],
        );
      } else if (cambio.tipo === 'LIBERAR') {
        await executor.consultar(
          'DELETE FROM identidades_paciente WHERE clave = ?',
          [clave],
        );
      }
    } else if (cambio.agregado === 'historiales' || cambio.agregado === 'historial') {
      if (cambio.tipo === 'MODIFICAR') {
        const archivo = cambio.nuevoEstado as ArchivoRegistrado;
        if (archivo && archivo.motivo && archivo.causa) {
          const resId = await executor.consultar<{ id_paciente: number | string }>(
            'SELECT id_paciente FROM paciente WHERE id_publico = ?',
            [cambio.recursoId],
          );
          const idPaciente = resId.filas[0]?.id_paciente;
          if (idPaciente !== undefined) {
            await executor.consultar(
              `UPDATE historial_clinico SET
                estado = 'ARCHIVADO',
                causa_baja = ?,
                motivo_baja = ?,
                fecha_baja = ?,
                actor_baja = ?,
                revision = revision + 1
              WHERE id_paciente = ?`,
              [
                archivo.causa,
                archivo.motivo,
                new Date(archivo.fecha),
                archivo.actorId,
                idPaciente,
              ],
            );

            await executor.consultar(
              "UPDATE paciente SET estado = 'INACTIVO' WHERE id_paciente = ?",
              [idPaciente],
            );
          }
        }
      }
    }
  }
}
