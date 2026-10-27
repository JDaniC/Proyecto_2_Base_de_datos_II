import { createHash, randomUUID } from 'node:crypto';
import type { CambioPlanificado, ComandoEstable } from '../../../../aplicacion/puertos/nucleo.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { derivarClaveIdentificacion } from '../../../../dominio/compartido/normalizacion.js';
import { uuidPublico, type UUID } from '../../../../dominio/compartido/uuid.js';
import type {
  ArchivoRegistrado,
  Identificacion,
  Paciente,
} from '../../../../dominio/clinica/paciente.js';
import type { EjecutorSql } from '../../sql/tipos-sql.js';

function dividirNombre(texto: string): [string, string | null] {
  const partes = texto.trim().split(/\s+/);
  const primero = (partes[0] ?? '').slice(0, 80);
  const segundo = partes.length > 1 ? partes.slice(1).join(' ').slice(0, 80) : null;
  return [primero || 'Sin nombre', segundo];
}

export async function aplicarCambiosPacientesPostgresql(
  executor: EjecutorSql,
  contexto: ContextoAutenticado,
  comando: ComandoEstable,
  cambios: readonly CambioPlanificado[],
): Promise<void> {
  for (const cambio of cambios) {
    if (cambio.agregado === 'pacientes') {
      if (cambio.tipo === 'CREAR') {
        const pac = cambio.nuevoEstado as Paciente;
        const cui = pac.identificacion?.tipo === 'CUI' ? pac.identificacion.numero : null;
        const [primerNombre, segundoNombre] = dividirNombre(pac.nombres);
        const [primerApellido, segundoApellido] = dividirNombre(pac.apellidos);
        const resPaciente = await executor.consultar<{ id_paciente: number | string }>(
          `INSERT INTO paciente (
            id_publico, revision, cui, primer_nombre, segundo_nombre,
            primer_apellido, segundo_apellido, fecha_nacimiento, sexo,
            tipo_sangre, telefono_principal, correo_principal, direccion
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id_paciente`,
          [
            pac.id,
            pac.version,
            cui,
            primerNombre,
            segundoNombre,
            primerApellido,
            segundoApellido,
            pac.fechaNacimiento,
            pac.sexo,
            pac.grupoSanguineo ?? null,
            pac.telefono ?? null,
            pac.correo ?? null,
            pac.direccion ?? null,
          ],
        );

        const idPaciente = resPaciente.filas[0]?.id_paciente;
        if (idPaciente === undefined) {
          throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se pudo obtener el identificador interno del paciente.');
        }

        if (pac.contactoEmergencia) {
          const [ceNom1, ceNom2] = dividirNombre(pac.contactoEmergencia.nombres);
          const [ceApe1, ceApe2] = dividirNombre(pac.contactoEmergencia.apellidos);
          await executor.consultar(
            `INSERT INTO contacto_emergencia (
              id_publico, revision, id_paciente, primer_nombre,
              segundo_nombre, primer_apellido, segundo_apellido, parentesco, telefono
            ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidPublico(randomUUID()),
              idPaciente,
              ceNom1,
              ceNom2,
              ceApe1,
              ceApe2,
              pac.contactoEmergencia.parentesco,
              pac.contactoEmergencia.telefono,
            ],
          );
        }

        const historialId = comando.ids.historial_id ?? uuidPublico(randomUUID());
        await executor.consultar(
          `INSERT INTO historial_clinico (
            id_publico, revision, id_paciente, numero_historial,
            fecha_apertura, estado_historial
          ) VALUES ($1, 1, $2, $3, CURRENT_DATE, 'ACTIVO')`,
          [historialId, idPaciente, pac.codigoLegible],
        );
      } else if (cambio.tipo === 'MODIFICAR' || cambio.tipo === 'ACTUALIZAR') {
        const pac = cambio.nuevoEstado as Paciente;
        const cui = pac.identificacion?.tipo === 'CUI' ? pac.identificacion.numero : null;
        const [primerNombre, segundoNombre] = dividirNombre(pac.nombres);
        const [primerApellido, segundoApellido] = dividirNombre(pac.apellidos);
        const resUpdate = await executor.consultar<{ id_paciente: number | string }>(
          `UPDATE paciente SET
            revision = $1,
            primer_nombre = $2,
            segundo_nombre = $3,
            primer_apellido = $4,
            segundo_apellido = $5,
            fecha_nacimiento = $6,
            sexo = $7,
            tipo_sangre = $8,
            telefono_principal = $9,
            correo_principal = $10,
            direccion = $11,
            cui = $12
          WHERE id_publico = $13 AND revision = $14
          RETURNING id_paciente`,
          [
            pac.version,
            primerNombre,
            segundoNombre,
            primerApellido,
            segundoApellido,
            pac.fechaNacimiento,
            pac.sexo,
            pac.grupoSanguineo ?? null,
            pac.telefono ?? null,
            pac.correo ?? null,
            pac.direccion ?? null,
            cui,
            pac.id,
            cambio.versionAnterior,
          ],
        );

        const idPaciente = resUpdate.filas[0]?.id_paciente;
        if (idPaciente === undefined) {
          throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El paciente ha sido modificado por otro proceso.');
        }

        await executor.consultar(
          'DELETE FROM contacto_emergencia WHERE id_paciente = $1',
          [idPaciente],
        );

        if (pac.contactoEmergencia) {
          const [ceNom1, ceNom2] = dividirNombre(pac.contactoEmergencia.nombres);
          const [ceApe1, ceApe2] = dividirNombre(pac.contactoEmergencia.apellidos);
          await executor.consultar(
            `INSERT INTO contacto_emergencia (
              id_publico, revision, id_paciente, primer_nombre,
              segundo_nombre, primer_apellido, segundo_apellido, parentesco, telefono
            ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              uuidPublico(randomUUID()),
              idPaciente,
              ceNom1,
              ceNom2,
              ceApe1,
              ceApe2,
              pac.contactoEmergencia.parentesco,
              pac.contactoEmergencia.telefono,
            ],
          );
        }
      }
      } else if (cambio.agregado === 'identidades') {
      const estado = cambio.nuevoEstado as { identificacion: Identificacion; titularId?: UUID };
      const clave = createHash('sha256')
        .update(derivarClaveIdentificacion(estado.identificacion.tipo, estado.identificacion.numero))
        .digest('hex');

      if (cambio.tipo === 'RESERVAR') {
        const titularId = estado.titularId ?? (cambio.recursoId as UUID);
        const resId = await executor.consultar<{ id_paciente: number | string }>(
          'SELECT id_paciente FROM paciente WHERE id_publico = $1',
          [titularId],
        );
        const idPaciente = resId.filas[0]?.id_paciente;
        if (idPaciente === undefined) {
          throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se encontró el paciente para asociar la identidad.');
        }

        await executor.consultar(
          `INSERT INTO identidades_paciente (clave, tipo_documento, numero_documento, id_paciente)
          VALUES ($1, $2, $3, $4)`,
          [clave, estado.identificacion.tipo, estado.identificacion.numero, idPaciente],
        );
      } else if (cambio.tipo === 'LIBERAR') {
        await executor.consultar(
          'DELETE FROM identidades_paciente WHERE clave = $1',
          [clave],
        );
      }
    } else if (cambio.agregado === 'historiales' || cambio.agregado === 'historial') {
      if (cambio.tipo === 'MODIFICAR') {
        const archivo = cambio.nuevoEstado as ArchivoRegistrado;
        if (archivo && archivo.motivo && archivo.causa) {
          const resId = await executor.consultar<{ id_paciente: number | string }>(
            'SELECT id_paciente FROM paciente WHERE id_publico = $1',
            [cambio.recursoId],
          );
          const idPaciente = resId.filas[0]?.id_paciente;
          if (idPaciente !== undefined) {
            await executor.consultar(
              `UPDATE historial_clinico SET
                estado_historial = 'ARCHIVADO',
                causa_baja = $1,
                motivo_baja = $2,
                fecha_baja = $3,
                actor_baja = $4,
                revision = revision + 1
              WHERE id_paciente = $5`,
              [
                archivo.causa,
                archivo.motivo,
                new Date(archivo.fecha),
                archivo.actorId,
                idPaciente,
              ],
            );
          }
        }
      }
    }
  }
}
