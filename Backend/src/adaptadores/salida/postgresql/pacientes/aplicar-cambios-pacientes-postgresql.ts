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
  const limpio = texto.trim();
  if (limpio.length === 0) return ['Sin nombre', null];
  if (limpio.length <= 80) {
    const idx = limpio.indexOf(' ');
    if (idx > 0) {
      return [limpio.slice(0, idx), limpio.slice(idx + 1).trim() || null];
    }
    return [limpio, null];
  }
  const corte = limpio.lastIndexOf(' ', 80);
  const puntoCorte = corte > 0 ? corte : 80;
  const primero = limpio.slice(0, puntoCorte).trim().slice(0, 80);
  const segundo = limpio.slice(puntoCorte).trim().slice(0, 80);
  return [primero || 'Sin nombre', segundo || null];
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
        const cui = pac.identificacion?.tipo === 'CUI' ? pac.identificacion.numero.replace(/[^0-9]/g, '') : null;

        // Recuperar registro existente bajo bloqueo pesimista
        const resPrevio = await executor.consultar<{
          id_paciente: number | string;
          revision: number | string;
          primer_nombre: string;
          segundo_nombre: string | null;
          primer_apellido: string;
          segundo_apellido: string | null;
        }>(
          `SELECT id_paciente, revision, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido
           FROM paciente WHERE id_publico = $1 FOR UPDATE`,
          [pac.id],
        );

        const filaPrevia = resPrevio.filas[0];
        if (!filaPrevia || Number(filaPrevia.revision) !== Number(cambio.versionAnterior)) {
          throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El paciente ha sido modificado por otro proceso.');
        }

        // Preservar componentes de nombre cuando no han sido modificados explícitamente
        const nomPreviaComb = [filaPrevia.primer_nombre, filaPrevia.segundo_nombre].filter(Boolean).join(' ');
        const apePreviaComb = [filaPrevia.primer_apellido, filaPrevia.segundo_apellido].filter(Boolean).join(' ');

        let [primerNombre, segundoNombre] = [filaPrevia.primer_nombre, filaPrevia.segundo_nombre];
        if (pac.nombres !== nomPreviaComb) {
          [primerNombre, segundoNombre] = dividirNombre(pac.nombres);
        }

        let [primerApellido, segundoApellido] = [filaPrevia.primer_apellido, filaPrevia.segundo_apellido];
        if (pac.apellidos !== apePreviaComb) {
          [primerApellido, segundoApellido] = dividirNombre(pac.apellidos);
        }

        await executor.consultar(
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
          WHERE id_paciente = $13`,
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
            filaPrevia.id_paciente,
          ],
        );

        const idPaciente = filaPrevia.id_paciente;

        // Recuperar contacto de emergencia previo para preservar componentes de nombres si no cambiaron
        const resCePrevio = await executor.consultar<{
          primer_nombre: string;
          segundo_nombre: string | null;
          primer_apellido: string;
          segundo_apellido: string | null;
        }>(
          `SELECT primer_nombre, segundo_nombre, primer_apellido, segundo_apellido
           FROM contacto_emergencia WHERE id_paciente = $1`,
          [idPaciente],
        );
        const cePrevio = resCePrevio.filas[0];

        await executor.consultar(
          'DELETE FROM contacto_emergencia WHERE id_paciente = $1',
          [idPaciente],
        );

        if (pac.contactoEmergencia) {
          let ceNom1: string;
          let ceNom2: string | null;
          const ceNomComb = cePrevio ? [cePrevio.primer_nombre, cePrevio.segundo_nombre].filter(Boolean).join(' ') : '';
          if (cePrevio && pac.contactoEmergencia.nombres === ceNomComb) {
            ceNom1 = cePrevio.primer_nombre;
            ceNom2 = cePrevio.segundo_nombre;
          } else {
            [ceNom1, ceNom2] = dividirNombre(pac.contactoEmergencia.nombres);
          }

          let ceApe1: string;
          let ceApe2: string | null;
          const ceApeComb = cePrevio ? [cePrevio.primer_apellido, cePrevio.segundo_apellido].filter(Boolean).join(' ') : '';
          if (cePrevio && pac.contactoEmergencia.apellidos === ceApeComb) {
            ceApe1 = cePrevio.primer_apellido;
            ceApe2 = cePrevio.segundo_apellido;
          } else {
            [ceApe1, ceApe2] = dividirNombre(pac.contactoEmergencia.apellidos);
          }

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

        // Verificar colisión contra CUIs preexistentes en la tabla paciente
        if (estado.identificacion.tipo === 'CUI') {
          const cuiDigitos = estado.identificacion.numero.replace(/[^0-9]/g, '');
          const dupCui = await executor.consultar<{ id_paciente: number | string }>(
            `SELECT id_paciente FROM paciente
             WHERE id_paciente <> $1 AND regexp_replace(COALESCE(cui, ''), '[^0-9]', '', 'g') = $2`,
            [idPaciente, cuiDigitos],
          );
          if (dupCui.filas.length > 0) {
            throw new ErrorDominio('PACIENTE_DUPLICADO', 'Ya existe un paciente registrado con este CUI.');
          }
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
          const resP = await executor.consultar<{ id_paciente: number | string; revision: number | string }>(
            'SELECT id_paciente, revision FROM paciente WHERE id_publico = $1 FOR UPDATE',
            [cambio.recursoId],
          );
          const filaP = resP.filas[0];
          if (!filaP) {
            throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No se encontró el paciente para archivar.');
          }
          if (cambio.versionAnterior !== null && Number(filaP.revision) !== Number(cambio.versionAnterior)) {
            throw new ErrorDominio('VERSION_DESACTUALIZADA', 'El paciente ha sido modificado concurrentemente.');
          }

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
              filaP.id_paciente,
            ],
          );

          // Avanzar la revisión compartida del paciente de forma atómica
          await executor.consultar(
            'UPDATE paciente SET revision = revision + 1 WHERE id_paciente = $1',
            [filaP.id_paciente],
          );
        }
      }
    }
  }
}
