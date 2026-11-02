import { randomUUID } from 'node:crypto';
import type { UUID } from '../../../../dominio/compartido/uuid.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../../dominio/compartido/version.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import type { EjecutorSql } from '../../sql/tipos-sql.js';
import type {
  PuertosHospital,
  PaginaHospital,
  ParametrosIngresoHospitalario,
  ParametrosEgresoHospitalario,
  ParametrosAsignarCama,
  ParametrosLiberarCama,
  ParametrosNotaEvolucion,
  ParametrosProcedimientoHospitalario,
} from '../../../../aplicacion/puertos/hospital.js';
import type {
  CamaHospitalaria,
  Hospitalizacion,
  ResumenHospitalizacion,
  AsignacionCamaItem,
  NotaEvolucionItem,
  ProcedimientoHospitalarioItem,
  EstadoCama,
  EstadoHospitalizacion,
  TipoEgresoHospitalario,
} from '../../../../dominio/hospital/hospitalizacion.js';

interface FilaCama extends Record<string, unknown> {
  id_publico: string;
  revision: number | string;
  id_cama: number | string;
  id_habitacion: number | string;
  numero_cama: string;
  estado_operativo: string;
  habitacion_estado: string;
  habitacion_id_publico: string;
  habitacion_numero: string;
  habitacion_piso: string | null;
  habitacion_tipo: string | null;
  id_hospitalizacion_activa: string | null;
  paciente_nombre_actual: string | null;
}

interface FilaHospitalizacion extends Record<string, unknown> {
  id_publico: string;
  revision: number | string;
  id_hospitalizacion: number | string;
  id_paciente: number | string;
  fecha_ingreso: string | Date;
  fecha_egreso: string | Date | null;
  motivo_ingreso: string;
  observaciones: string | null;
  estado: string;
  paciente_id_publico: string;
  paciente_nombre: string;
  paciente_expediente: string;
  medico_id_publico: string;
  medico_nombre: string;
  medico_colegiado: string;
  cama_actual_id_publico: string | null;
  cama_actual_numero: string | null;
  cama_actual_habitacion: string | null;
  cama_actual_servicio: string | null;
}

interface FilaAsignacion extends Record<string, unknown> {
  id_publico: string;
  revision: number | string;
  fecha_hora_inicio: string | Date;
  fecha_hora_fin: string | Date | null;
  cama_id_publico: string;
  numero_cama: string;
  habitacion_numero: string;
  habitacion_tipo: string | null;
}

interface ObservacionesEvolucion {
  diagnosticoIngresoCIE?: string | undefined;
  diagnosticoIngresoNombre?: string | undefined;
  diagnosticoEgresoCIE?: string | undefined;
  diagnosticoEgresoNombre?: string | undefined;
  tipoEgreso?: TipoEgresoHospitalario | undefined;
  resumenEgreso?: string | undefined;
  motivosAsignacion?: Record<string, string> | undefined;
  notasEvolucion?: Array<{
    id: string;
    fechaHora: string;
    medicoId: string;
    medicoNombre: string;
    medicoColegiado: string;
    notaClinica: string;
    planTerapeutico?: string | undefined;
  }> | undefined;
  procedimientos?: Array<{
    id: string;
    nombre: string;
    codigo?: string | undefined;
    fechaHora: string;
    profesionalId: string;
    profesionalNombre: string;
    resultado: string;
    observaciones?: string | undefined;
  }> | undefined;
}

function parsearObservaciones(texto: string | null): ObservacionesEvolucion {
  if (!texto) return {};
  try {
    return JSON.parse(texto) as ObservacionesEvolucion;
  } catch {
    return { resumenEgreso: texto };
  }
}

function serializarObservaciones(obs: ObservacionesEvolucion): string {
  const serializado = JSON.stringify(obs);
  if ((obs.notasEvolucion?.length ?? 0) > 100 || (obs.procedimientos?.length ?? 0) > 100 ||
      Buffer.byteLength(serializado, 'utf8') > 262144) {
    throw new ErrorDominio('SOLICITUD_INVALIDA', 'El detalle clínico supera el límite de 100 elementos o 256 KiB.');
  }
  return serializado;
}

function mapearEstadoCama(estadoDb: string, ocupada: boolean): EstadoCama {
  if (ocupada) return 'OCUPADA';
  if (estadoDb === 'DISPONIBLE') return 'DISPONIBLE';
  return 'MANTENIMIENTO';
}

function mapearFilaCama(f: FilaCama): CamaHospitalaria {
  const ocupada = Boolean(f.id_hospitalizacion_activa);
  return Object.freeze({
    id: uuidPublico(f.id_publico),
    habitacionId: uuidPublico(f.habitacion_id_publico),
    numeroHabitacion: f.habitacion_numero,
    piso: Number(f.habitacion_piso) || 1,
    salaServicio: f.habitacion_tipo || 'Medicina General',
    codigoCama: `${f.habitacion_numero}-${f.numero_cama}`,
    estado: mapearEstadoCama(f.habitacion_estado === 'DISPONIBLE' ? f.estado_operativo : f.habitacion_estado, ocupada),
    hospitalizacionActivaId: f.id_hospitalizacion_activa ? uuidPublico(f.id_hospitalizacion_activa) : undefined,
    pacienteActual: f.paciente_nombre_actual?.trim() || undefined,
    version: versionPositiva(Number(f.revision)),
  });
}

function formatearFechaIso(valor: string | Date | null | undefined): string | undefined {
  if (!valor) return undefined;
  if (valor instanceof Date) return valor.toISOString();
  return new Date(valor).toISOString();
}

export function crearPuertosHospitalPostgresql(ejecutor: EjecutorSql, estable?: {
  instante: string; hospitalizacionId: string; asignacionId: string; detalleId: string;
}): PuertosHospital {
  return {
    camas: {
      async listar(): Promise<readonly CamaHospitalaria[]> {
        const sql = `
          SELECT c.id_publico, c.revision, c.id_cama, c.id_habitacion, c.numero_cama, c.estado_operativo,
                 h.estado_operativo AS habitacion_estado, h.id_publico AS habitacion_id_publico, h.numero AS habitacion_numero, h.piso AS habitacion_piso, h.tipo AS habitacion_tipo,
                 activa.id_publico AS id_hospitalizacion_activa,
                 CONCAT_WS(' ', p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido) AS paciente_nombre_actual
            FROM cama c
            JOIN habitacion h ON c.id_habitacion = h.id_habitacion
            LEFT JOIN (
              SELECT ac.id_cama, hosp.id_publico, hosp.id_paciente
                FROM asignacion_cama ac
                JOIN hospitalizacion hosp ON ac.id_hospitalizacion = hosp.id_hospitalizacion
               WHERE ac.fecha_hora_inicio <= $1::timestamp
                 AND (ac.fecha_hora_fin IS NULL OR ac.fecha_hora_fin > $1::timestamp)
            ) activa ON c.id_cama = activa.id_cama
            LEFT JOIN paciente p ON activa.id_paciente = p.id_paciente
           ORDER BY h.piso ASC, h.numero ASC, c.numero_cama ASC
        `;
        const res = await ejecutor.consultar<FilaCama>(sql, [new Date().toISOString()]);
        return Object.freeze(res.filas.map(mapearFilaCama));
      },

      async porId(id: UUID): Promise<CamaHospitalaria | null> {
        const sql = `
          SELECT c.id_publico, c.revision, c.id_cama, c.id_habitacion, c.numero_cama, c.estado_operativo,
                 h.estado_operativo AS habitacion_estado, h.id_publico AS habitacion_id_publico, h.numero AS habitacion_numero, h.piso AS habitacion_piso, h.tipo AS habitacion_tipo,
                 activa.id_publico AS id_hospitalizacion_activa,
                 CONCAT_WS(' ', p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido) AS paciente_nombre_actual
            FROM cama c
            JOIN habitacion h ON c.id_habitacion = h.id_habitacion
            LEFT JOIN (
              SELECT ac.id_cama, hosp.id_publico, hosp.id_paciente
                FROM asignacion_cama ac
                JOIN hospitalizacion hosp ON ac.id_hospitalizacion = hosp.id_hospitalizacion
               WHERE ac.fecha_hora_inicio <= $2::timestamp
                 AND (ac.fecha_hora_fin IS NULL OR ac.fecha_hora_fin > $2::timestamp)
            ) activa ON c.id_cama = activa.id_cama
            LEFT JOIN paciente p ON activa.id_paciente = p.id_paciente
           WHERE c.id_publico = $1
        `;
        const res = await ejecutor.consultar<FilaCama>(sql, [id, new Date().toISOString()]);
        const f = res.filas[0];
        if (!f) return null;
        return mapearFilaCama(f);
      },
    },

    hospitalizaciones: {
      async porId(id: UUID): Promise<Hospitalizacion | null> {
        return reconstruirHospitalizacion(ejecutor, id);
      },

      listar: (estado, pagina) => listarResumenes(ejecutor, estado, undefined, pagina),
      porPaciente: (pacienteId, pagina, estado) => listarResumenes(ejecutor, estado, pacienteId, pagina),

      async ingresar(params: ParametrosIngresoHospitalario, medicoResponsableId: UUID): Promise<Hospitalizacion> {
        // Validar paciente
        const pacRes = await ejecutor.consultar<{ id_paciente: number; estado: string; id_publico: string }>(
          'SELECT p.id_paciente, h.estado_historial AS estado, p.id_publico FROM paciente p JOIN historial_clinico h USING(id_paciente) WHERE p.id_publico = $1 FOR UPDATE OF h',
          [params.pacienteId],
        );
        const paciente = pacRes.filas[0];
        if (!paciente) {
          throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Paciente no encontrado.');
        }
        if (paciente.estado === 'ARCHIVADO') {
          throw new ErrorDominio('ESTADO_INVALIDO', 'No es posible ingresar a un paciente con historial archivado.');
        }

        // Validar médico responsable
        const medRes = await ejecutor.consultar<{ id_personal: number; estado: string }>(
          'SELECT id_personal, estado FROM personal_medico WHERE id_publico = $1',
          [medicoResponsableId],
        );
        const medico = medRes.filas[0];
        if (!medico || medico.estado !== 'ACTIVO') {
          throw new ErrorDominio('SIN_PERMISO', 'El profesional responsable debe ser un médico activo.');
        }

        // Validar cama
        const camaRes = await ejecutor.consultar<{ id_cama: number; estado_operativo: string; revision: number; numero_cama: string }>(
          `SELECT c.id_cama, CASE WHEN h.estado_operativo = 'DISPONIBLE' THEN c.estado_operativo ELSE h.estado_operativo END AS estado_operativo, c.revision, c.numero_cama FROM cama c JOIN habitacion h USING(id_habitacion) WHERE c.id_publico = $1 FOR UPDATE OF c, h`,
          [params.camaId],
        );
        const cama = camaRes.filas[0];
        if (!cama) {
          throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Cama no encontrada.');
        }
        if (cama.estado_operativo !== 'DISPONIBLE') {
          throw new ErrorDominio('ESTADO_INVALIDO', `La cama ${cama.numero_cama} se encuentra en ${cama.estado_operativo}.`);
        }
        if (params.versionEsperadaCama !== undefined && Number(cama.revision) !== params.versionEsperadaCama) {
          throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La versión de la cama ha cambiado.');
        }

        // Validar que la cama no tenga una asignación activa abierta
        const ocupacionRes = await ejecutor.consultar<{ id_asignacion: number }>(
          'SELECT id_asignacion FROM asignacion_cama WHERE id_cama = $1 AND fecha_hora_fin IS NULL',
          [cama.id_cama],
        );
        if (ocupacionRes.filas.length > 0) {
          throw new ErrorDominio('ESTADO_INVALIDO', `La cama ${cama.numero_cama} ya se encuentra ocupada.`);
        }

        const ahoraIso = estable?.instante ?? new Date().toISOString();
        const obsInicial: ObservacionesEvolucion = {
          diagnosticoIngresoCIE: params.diagnosticoIngresoCIE,
          diagnosticoIngresoNombre: params.diagnosticoIngresoNombre,
          notasEvolucion: [],
          procedimientos: [],
        };

        let hospIdInterno: number;
        let hospIdPublico: string;

        try {
          const insertHosp = await ejecutor.consultar<{ id_hospitalizacion: number; id_publico: string }>(
            `INSERT INTO hospitalizacion(id_publico, id_paciente, id_personal_responsable_ingreso, fecha_ingreso, motivo_ingreso, observaciones, estado)
             VALUES ($6, $1, $2, $3, $4, $5, 'ACTIVA')
             RETURNING id_hospitalizacion, id_publico`,
            [paciente.id_paciente, medico.id_personal, ahoraIso, params.motivoIngreso, serializarObservaciones(obsInicial), estable?.hospitalizacionId ?? randomUUID()],
          );
          hospIdInterno = insertHosp.filas[0]!.id_hospitalizacion;
          hospIdPublico = insertHosp.filas[0]!.id_publico;
        } catch (error: unknown) {
          manejarErrorPostgres(error);
          throw error;
        }

        // Asignar cama
        try {
          await ejecutor.consultar(
            `INSERT INTO asignacion_cama(id_publico, id_hospitalizacion, id_cama, fecha_hora_inicio)
             VALUES ($4, $1, $2, $3)`,
            [hospIdInterno, cama.id_cama, ahoraIso, estable?.asignacionId ?? randomUUID()],
          );
        } catch (error: unknown) {
          manejarErrorPostgres(error);
          throw error;
        }

        // Vincular consultas enlazadas si existen
        if (params.consultasEnlazadasIds && params.consultasEnlazadasIds.length > 0) {
          for (const consPublicId of params.consultasEnlazadasIds) {
            const consRes = await ejecutor.consultar<{ id_consulta: number; id_paciente: number }>(
              `SELECT c.id_consulta, h.id_paciente
                 FROM consulta c
                 JOIN historial_clinico h USING (id_historial)
                WHERE c.id_publico = $1`,
              [consPublicId],
            );
            const cons = consRes.filas[0];
            if (!cons) {
              throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'Consulta enlazada no encontrada.');
            }
            if (Number(cons.id_paciente) !== Number(paciente.id_paciente)) {
              throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'Las consultas seleccionadas no pertenecen a este paciente.');
            }
            try {
              await ejecutor.consultar(
                `INSERT INTO hospitalizacion_consulta(id_consulta, id_hospitalizacion)
                 VALUES ($1, $2)`,
                [cons.id_consulta, hospIdInterno],
              );
            } catch (error: unknown) {
              manejarErrorPostgres(error);
              throw error;
            }
          }
        }

        const reconstruido = await reconstruirHospitalizacion(ejecutor, uuidPublico(hospIdPublico));
        if (!reconstruido) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible cargar el ingreso hospitalario.');
        return reconstruido;
      },

      async egresar(params: ParametrosEgresoHospitalario, _medicoResponsableId: UUID): Promise<Hospitalizacion> {
        const hospRes = await ejecutor.consultar<{
          id_hospitalizacion: number;
          revision: number;
          fecha_ingreso: string | Date;
          estado: string;
          observaciones: string | null;
        }>(
          `SELECT id_hospitalizacion, revision, fecha_ingreso AT TIME ZONE 'UTC' AS fecha_ingreso, estado, observaciones
             FROM hospitalizacion
            WHERE id_publico = $1
              FOR UPDATE`,
          [params.hospitalizacionId],
        );
        const hosp = hospRes.filas[0];
        if (!hosp) {
          throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Hospitalización no encontrada.');
        }
        if (hosp.estado !== 'ACTIVA') {
          throw new ErrorDominio('ESTADO_INVALIDO', 'La hospitalización ya no se encuentra activa.');
        }
        if (params.versionEsperada !== undefined && Number(hosp.revision) !== params.versionEsperada) {
          throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La versión de la hospitalización ha cambiado.');
        }

        const fechaIngresoDate = new Date(hosp.fecha_ingreso);
        const fechaEgresoDate = new Date(params.fechaEgreso);
        if (fechaEgresoDate < fechaIngresoDate) {
          throw new ErrorDominio('SOLICITUD_INVALIDA', 'La fecha de egreso no puede ser anterior a la fecha de ingreso.');
        }

        const obs = parsearObservaciones(hosp.observaciones);
        obs.diagnosticoEgresoCIE = params.diagnosticoEgresoCIE;
        obs.diagnosticoEgresoNombre = params.diagnosticoEgresoNombre;
        obs.tipoEgreso = params.tipoEgreso;
        obs.resumenEgreso = params.resumenClinico;

        await validarPeriodo(ejecutor, hosp.id_hospitalizacion, params.fechaEgreso);
        // Cerrar asignación de cama abierta si existe
        await ejecutor.consultar(
          `UPDATE asignacion_cama
              SET fecha_hora_fin = $1, revision = revision + 1
            WHERE id_hospitalizacion = $2 AND fecha_hora_fin IS NULL`,
          [params.fechaEgreso, hosp.id_hospitalizacion],
        );

        // Actualizar hospitalización
        await ejecutor.consultar(
          `UPDATE hospitalizacion
              SET estado = 'FINALIZADA',
                  fecha_egreso = $1,
                  observaciones = $2,
                  revision = revision + 1
            WHERE id_hospitalizacion = $3`,
          [params.fechaEgreso, serializarObservaciones(obs), hosp.id_hospitalizacion],
        );

        const reconstruido = await reconstruirHospitalizacion(ejecutor, params.hospitalizacionId);
        if (!reconstruido) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible cargar el egreso hospitalario.');
        return reconstruido;
      },

      async asignarCama(params: ParametrosAsignarCama, _actorId: UUID): Promise<Hospitalizacion> {
        const hospRes = await ejecutor.consultar<{
          id_hospitalizacion: number;
          revision: number;
          estado: string;
          fecha_ingreso: string | Date;
          observaciones: string | null;
        }>(
          `SELECT id_hospitalizacion, revision, estado, fecha_ingreso AT TIME ZONE 'UTC' AS fecha_ingreso, observaciones
             FROM hospitalizacion
            WHERE id_publico = $1
              FOR UPDATE`,
          [params.hospitalizacionId],
        );
        const hosp = hospRes.filas[0];
        if (!hosp) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Hospitalización no encontrada.');
        if (hosp.estado !== 'ACTIVA') throw new ErrorDominio('ESTADO_INVALIDO', 'La hospitalización no está activa.');
        if (params.versionEsperada !== undefined && Number(hosp.revision) !== params.versionEsperada) {
          throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La versión de la hospitalización ha cambiado.');
        }

        const camaDestRes = await ejecutor.consultar<{ id_cama: number; estado_operativo: string; numero_cama: string }>(
          `SELECT c.id_cama, CASE WHEN h.estado_operativo = 'DISPONIBLE' THEN c.estado_operativo ELSE h.estado_operativo END AS estado_operativo, c.numero_cama FROM cama c JOIN habitacion h USING(id_habitacion) WHERE c.id_publico = $1 FOR UPDATE OF c, h`,
          [params.nuevaCamaId],
        );
        const camaDest = camaDestRes.filas[0];
        if (!camaDest) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Cama destino no encontrada.');
        if (camaDest.estado_operativo !== 'DISPONIBLE') {
          throw new ErrorDominio('ESTADO_INVALIDO', `La cama ${camaDest.numero_cama} se encuentra en ${camaDest.estado_operativo}.`);
        }

        const ocupacionRes = await ejecutor.consultar<{ id_asignacion: number }>(
          'SELECT id_asignacion FROM asignacion_cama WHERE id_cama = $1 AND fecha_hora_fin IS NULL',
          [camaDest.id_cama],
        );
        if (ocupacionRes.filas.length > 0) {
          throw new ErrorDominio('ESTADO_INVALIDO', `La cama ${camaDest.numero_cama} ya se encuentra ocupada.`);
        }

        await validarPeriodo(ejecutor, hosp.id_hospitalizacion, params.fechaInicio);
        // Cerrar asignación anterior
        await ejecutor.consultar(
          `UPDATE asignacion_cama
              SET fecha_hora_fin = $1, revision = revision + 1
            WHERE id_hospitalizacion = $2 AND fecha_hora_fin IS NULL`,
          [params.fechaInicio, hosp.id_hospitalizacion],
        );

        const asignacionId = estable?.asignacionId ?? randomUUID();
        // Crear nueva asignación
        try {
          await ejecutor.consultar(
            `INSERT INTO asignacion_cama(id_publico, id_hospitalizacion, id_cama, fecha_hora_inicio)
             VALUES ($4, $1, $2, $3)`,
            [hosp.id_hospitalizacion, camaDest.id_cama, params.fechaInicio, asignacionId],
          );
        } catch (error: unknown) {
          manejarErrorPostgres(error);
          throw error;
        }

        const obs = parsearObservaciones(hosp.observaciones);
        if (params.motivo) obs.motivosAsignacion = { ...obs.motivosAsignacion, [asignacionId]: params.motivo };
        await ejecutor.consultar(
          'UPDATE hospitalizacion SET revision = revision + 1, observaciones=$2 WHERE id_hospitalizacion = $1',
          [hosp.id_hospitalizacion, serializarObservaciones(obs)],
        );

        const reconstruido = await reconstruirHospitalizacion(ejecutor, params.hospitalizacionId);
        if (!reconstruido) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible recargar la hospitalización tras traslado.');
        return reconstruido;
      },

      async liberarCama(params: ParametrosLiberarCama, _actorId: UUID): Promise<Hospitalizacion> {
        const hospRes = await ejecutor.consultar<{
          id_hospitalizacion: number;
          revision: number;
          estado: string;
        }>(
          `SELECT id_hospitalizacion, revision, estado
             FROM hospitalizacion
            WHERE id_publico = $1
              FOR UPDATE`,
          [params.hospitalizacionId],
        );
        const hosp = hospRes.filas[0];
        if (!hosp) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Hospitalización no encontrada.');
        if (params.versionEsperada !== undefined && Number(hosp.revision) !== params.versionEsperada) {
          throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La versión de la hospitalización ha cambiado.');
        }

        if (hosp.estado !== 'ACTIVA') throw new ErrorDominio('ESTADO_INVALIDO', 'La estancia no está activa.');
        await validarPeriodo(ejecutor, hosp.id_hospitalizacion, params.fechaFin);
        await ejecutor.consultar(
          `UPDATE asignacion_cama
              SET fecha_hora_fin = $1, revision = revision + 1
            WHERE id_hospitalizacion = $2 AND fecha_hora_fin IS NULL`,
          [params.fechaFin, hosp.id_hospitalizacion],
        );

        await ejecutor.consultar(
          'UPDATE hospitalizacion SET revision = revision + 1 WHERE id_hospitalizacion = $1',
          [hosp.id_hospitalizacion],
        );

        const reconstruido = await reconstruirHospitalizacion(ejecutor, params.hospitalizacionId);
        if (!reconstruido) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible recargar la hospitalización tras liberar cama.');
        return reconstruido;
      },

      async agregarNotaEvolucion(
        params: ParametrosNotaEvolucion,
        medico: { readonly id: UUID; readonly nombre: string; readonly colegiado: string },
      ): Promise<Hospitalizacion> {
        const hospRes = await ejecutor.consultar<{
          id_hospitalizacion: number;
          revision: number;
          estado: string;
          observaciones: string | null;
        }>(
          `SELECT id_hospitalizacion, revision, estado, observaciones
             FROM hospitalizacion
            WHERE id_publico = $1
              FOR UPDATE`,
          [params.hospitalizacionId],
        );
        const hosp = hospRes.filas[0];
        if (!hosp) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Hospitalización no encontrada.');
        if (hosp.estado !== 'ACTIVA') {
          throw new ErrorDominio('ESTADO_INVALIDO', 'No se pueden registrar notas de evolución en una estancia egresada.');
        }
        if (params.versionEsperada !== undefined && Number(hosp.revision) !== params.versionEsperada) {
          throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La versión de la hospitalización ha cambiado.');
        }

        const obs = parsearObservaciones(hosp.observaciones);
        if (!obs.notasEvolucion) obs.notasEvolucion = [];
        obs.notasEvolucion.unshift({
          id: estable?.detalleId ?? randomUUID(),
          fechaHora: estable?.instante ?? new Date().toISOString(),
          medicoId: medico.id,
          medicoNombre: (await leerAutor(ejecutor, medico.id)).nombre,
          medicoColegiado: (await leerAutor(ejecutor, medico.id)).colegiado,
          notaClinica: params.notaClinica,
          planTerapeutico: params.planTerapeutico,
        });

        await ejecutor.consultar(
          `UPDATE hospitalizacion
              SET observaciones = $1, revision = revision + 1
            WHERE id_hospitalizacion = $2`,
          [serializarObservaciones(obs), hosp.id_hospitalizacion],
        );

        const reconstruido = await reconstruirHospitalizacion(ejecutor, params.hospitalizacionId);
        if (!reconstruido) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible recargar la hospitalización tras nota de evolución.');
        return reconstruido;
      },

      async agregarProcedimiento(
        params: ParametrosProcedimientoHospitalario,
        profesional: { readonly id: UUID; readonly nombre: string },
      ): Promise<Hospitalizacion> {
        const hospRes = await ejecutor.consultar<{
          id_hospitalizacion: number;
          revision: number;
          estado: string;
          observaciones: string | null;
        }>(
          `SELECT id_hospitalizacion, revision, estado, observaciones
             FROM hospitalizacion
            WHERE id_publico = $1
              FOR UPDATE`,
          [params.hospitalizacionId],
        );
        const hosp = hospRes.filas[0];
        if (!hosp) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Hospitalización no encontrada.');
        if (params.versionEsperada !== undefined && Number(hosp.revision) !== params.versionEsperada) {
          throw new ErrorDominio('VERSION_DESACTUALIZADA', 'La versión de la hospitalización ha cambiado.');
        }

        if (hosp.estado !== 'ACTIVA') throw new ErrorDominio('ESTADO_INVALIDO', 'No se pueden agregar procedimientos a una estancia finalizada.');

        const obs = parsearObservaciones(hosp.observaciones);
        if (!obs.procedimientos) obs.procedimientos = [];
        obs.procedimientos.unshift({
          id: estable?.detalleId ?? randomUUID(),
          nombre: params.nombre,
          codigo: params.codigo,
          fechaHora: estable?.instante ?? new Date().toISOString(),
          profesionalId: profesional.id,
          profesionalNombre: (await leerAutor(ejecutor, profesional.id)).nombre,
          resultado: params.resultado,
          observaciones: params.observaciones,
        });

        await ejecutor.consultar(
          `UPDATE hospitalizacion
              SET observaciones = $1, revision = revision + 1
            WHERE id_hospitalizacion = $2`,
          [serializarObservaciones(obs), hosp.id_hospitalizacion],
        );

        const reconstruido = await reconstruirHospitalizacion(ejecutor, params.hospitalizacionId);
        if (!reconstruido) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'No fue posible recargar la hospitalización tras procedimiento.');
        return reconstruido;
      },
    },
  };
}

const SQL_HOSPITAL = `
    SELECT hosp.id_publico, hosp.revision, hosp.id_hospitalizacion, hosp.id_paciente,
           hosp.fecha_ingreso AT TIME ZONE 'UTC' AS fecha_ingreso, hosp.fecha_egreso AT TIME ZONE 'UTC' AS fecha_egreso, hosp.motivo_ingreso, hosp.observaciones, hosp.estado,
           p.id_publico AS paciente_id_publico,
           CONCAT_WS(' ', p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido) AS paciente_nombre,
           COALESCE(h.numero_historial, p.id_publico::text) AS paciente_expediente,
           pm.id_publico AS medico_id_publico,
           CONCAT_WS(' ', pm.primer_nombre, pm.segundo_nombre, pm.primer_apellido, pm.segundo_apellido) AS medico_nombre,
           pm.numero_colegiado AS medico_colegiado,
           c_activa.id_publico AS cama_actual_id_publico,
           c_activa.numero_cama AS cama_actual_numero,
           hab_activa.numero AS cama_actual_habitacion,
           hab_activa.tipo AS cama_actual_servicio
      FROM hospitalizacion hosp
      JOIN paciente p ON hosp.id_paciente = p.id_paciente
      LEFT JOIN historial_clinico h ON p.id_paciente = h.id_paciente
      JOIN personal_medico pm ON hosp.id_personal_responsable_ingreso = pm.id_personal
      LEFT JOIN asignacion_cama ac_activa ON hosp.id_hospitalizacion = ac_activa.id_hospitalizacion AND ac_activa.fecha_hora_inicio <= __AHORA__ AND (ac_activa.fecha_hora_fin IS NULL OR ac_activa.fecha_hora_fin > __AHORA__)
      LEFT JOIN cama c_activa ON ac_activa.id_cama = c_activa.id_cama
      LEFT JOIN habitacion hab_activa ON c_activa.id_habitacion = hab_activa.id_habitacion
  `;

async function reconstruirHospitalizacion(ejecutor: EjecutorSql, idPublico: UUID): Promise<Hospitalizacion | null> {
  const resHosp = await ejecutor.consultar<FilaHospitalizacion>(SQL_HOSPITAL.replaceAll('__AHORA__', '$2::timestamp') + ' WHERE hosp.id_publico = $1', [idPublico, new Date().toISOString()]);
  const f = resHosp.filas[0];
  if (!f) return null;

  const obs = parsearObservaciones(f.observaciones);

  // Consultas asignaciones de cama históricas
  const sqlAsig = `
    SELECT ac.id_publico, ac.revision, ac.fecha_hora_inicio AT TIME ZONE 'UTC' AS fecha_hora_inicio, ac.fecha_hora_fin AT TIME ZONE 'UTC' AS fecha_hora_fin,
           c.id_publico AS cama_id_publico, c.numero_cama,
           hab.numero AS habitacion_numero, hab.tipo AS habitacion_tipo
      FROM asignacion_cama ac
      JOIN cama c ON ac.id_cama = c.id_cama
      JOIN habitacion hab ON c.id_habitacion = hab.id_habitacion
     WHERE ac.id_hospitalizacion = $1
     ORDER BY ac.fecha_hora_inicio ASC
  `;
  const resAsig = await ejecutor.consultar<FilaAsignacion>(sqlAsig, [f.id_hospitalizacion]);
  const asignaciones: AsignacionCamaItem[] = resAsig.filas.map((a) => Object.freeze({
    id: uuidPublico(a.id_publico),
    camaId: uuidPublico(a.cama_id_publico),
    codigoCama: `${a.habitacion_numero}-${a.numero_cama}`,
    habitacion: `Habitación ${a.habitacion_numero}`,
    servicio: a.habitacion_tipo || 'Medicina General',
    fechaInicio: formatearFechaIso(a.fecha_hora_inicio)!,
    fechaFin: formatearFechaIso(a.fecha_hora_fin),
    version: versionPositiva(Number(a.revision)),
    motivoCambio: obs.motivosAsignacion?.[a.id_publico],
  }));

  // Consultas enlazadas
  const sqlCons = `
    SELECT c.id_publico
      FROM hospitalizacion_consulta hc
      JOIN consulta c ON hc.id_consulta = c.id_consulta
     WHERE hc.id_hospitalizacion = $1
  `;
  const resCons = await ejecutor.consultar<{ id_publico: string }>(sqlCons, [f.id_hospitalizacion]);
  const consultasEnlazadasIds = Object.freeze(resCons.filas.map((c) => uuidPublico(c.id_publico)));

  const notas: NotaEvolucionItem[] = (obs.notasEvolucion || []).map((n) => Object.freeze({
    id: uuidPublico(n.id.startsWith('nota-') ? '00000000-0000-0000-0000-' + n.id.slice(-12).padStart(12, '0') : n.id),
    fechaHora: n.fechaHora,
    medicoId: n.medicoId ? uuidPublico(n.medicoId) : undefined,
    medicoNombre: n.medicoNombre,
    medicoColegiado: n.medicoColegiado,
    notaClinica: n.notaClinica,
    planTerapeutico: n.planTerapeutico,
  }));

  const procedimientos: ProcedimientoHospitalarioItem[] = (obs.procedimientos || []).map((p) => Object.freeze({
    id: uuidPublico(p.id.startsWith('proc-') ? '00000000-0000-0000-0000-' + p.id.slice(-12).padStart(12, '0') : p.id),
    nombre: p.nombre,
    codigo: p.codigo,
    fechaHora: p.fechaHora,
    profesionalId: p.profesionalId ? uuidPublico(p.profesionalId) : undefined,
    profesionalNombre: p.profesionalNombre,
    resultado: p.resultado,
    observaciones: p.observaciones,
  }));

  const camaActual = f.cama_actual_id_publico ? Object.freeze({
    camaId: uuidPublico(f.cama_actual_id_publico),
    codigoCama: `${f.cama_actual_habitacion}-${f.cama_actual_numero}`,
    habitacion: `Habitación ${f.cama_actual_habitacion}`,
    servicio: f.cama_actual_servicio || 'Medicina General',
  }) : undefined;

  const respuesta = Object.freeze({
    id: uuidPublico(f.id_publico),
    codigoIngreso: `ING-${f.id_hospitalizacion.toString().padStart(6, '0')}`,
    pacienteId: uuidPublico(f.paciente_id_publico),
    pacienteNombre: f.paciente_nombre.trim(),
    pacienteExpediente: f.paciente_expediente,
    medicoTratanteId: uuidPublico(f.medico_id_publico),
    medicoTratanteNombre: f.medico_nombre.trim(),
    medicoTratanteColegiado: f.medico_colegiado || '',
    fechaIngreso: formatearFechaIso(f.fecha_ingreso)!,
    fechaEgreso: formatearFechaIso(f.fecha_egreso),
    estado: f.estado as EstadoHospitalizacion,
    diagnosticoIngresoCIE: obs.diagnosticoIngresoCIE || 'Z00.0',
    diagnosticoIngresoNombre: obs.diagnosticoIngresoNombre || f.motivo_ingreso,
    diagnosticoEgresoCIE: obs.diagnosticoEgresoCIE,
    diagnosticoEgresoNombre: obs.diagnosticoEgresoNombre,
    motivoIngreso: f.motivo_ingreso,
    resumenEgreso: obs.resumenEgreso,
    tipoEgreso: obs.tipoEgreso,
    camaActual,
    asignacionesCama: Object.freeze(asignaciones),
    consultasEnlazadasIds,
    notasEvolucion: Object.freeze(notas),
    procedimientos: Object.freeze(procedimientos),
    version: versionPositiva(Number(f.revision)),
  });
  if (notas.length > 100 || procedimientos.length > 100 || asignaciones.length > 100 || consultasEnlazadasIds.length > 100 ||
      Buffer.byteLength(JSON.stringify(respuesta), 'utf8') > 262144) {
    throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El detalle clínico requiere reconciliación por tamaño.');
  }
  return respuesta;

}

function manejarErrorPostgres(error: unknown): void {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    if (code === '23P01') {
      // exclusion_violation
      throw new ErrorDominio('ESTADO_INVALIDO', 'La cama seleccionada ya se encuentra ocupada en ese intervalo.');
    }
    if (code === '23514') {
      // check_violation
      const msg = String((error as { message?: string }).message || '');
      if (msg.includes('HOSPITALIZACION_PACIENTE_INCOMPATIBLE')) {
        throw new ErrorDominio('REFERENCIA_INCOMPATIBLE', 'Las consultas o diagnósticos pertenecen a otro paciente.');
      }
      throw new ErrorDominio('SOLICITUD_INVALIDA', 'Violación de restricción de fechas o coherencia clínica.');
    }
  }
}

async function leerAutor(ejecutor: EjecutorSql, id: UUID) {
  const r = await ejecutor.consultar<{ nombre: string; colegiado: string }>(
    `SELECT CONCAT_WS(' ', primer_nombre, segundo_nombre, primer_apellido, segundo_apellido) AS nombre,
      numero_colegiado AS colegiado FROM personal_medico WHERE id_publico=$1 AND estado='ACTIVO' FOR SHARE`, [id]);
  if (!r.filas[0]) throw new ErrorDominio('SIN_PERMISO', 'Profesional no disponible.');
  return r.filas[0];
}

async function validarPeriodo(ejecutor: EjecutorSql, id: number, fecha: string) {
  const r = await ejecutor.consultar<{ valido: boolean }>(
    `SELECT $2::timestamp >= h.fecha_ingreso AND NOT EXISTS(
       SELECT 1 FROM asignacion_cama a WHERE a.id_hospitalizacion=h.id_hospitalizacion
       AND (a.fecha_hora_inicio >= $2::timestamp OR a.fecha_hora_fin > $2::timestamp)) AS valido
     FROM hospitalizacion h WHERE h.id_hospitalizacion=$1`, [id, fecha]);
  if (!r.filas[0]?.valido) throw new ErrorDominio('SOLICITUD_INVALIDA', 'El período no es coherente con la estancia y sus asignaciones.');
}

async function listarResumenes(ejecutor: EjecutorSql, estado?: string, pacienteId?: UUID,
  pagina: PaginaHospital = { pagina: 1, limite: 25 }): Promise<readonly ResumenHospitalizacion[]> {
  if (!Number.isSafeInteger(pagina.pagina) || pagina.pagina < 1 || pagina.pagina > 40000 ||
      !Number.isSafeInteger(pagina.limite) || pagina.limite < 1 || pagina.limite > 100) {
    throw new ErrorDominio('SOLICITUD_INVALIDA', 'Página hospitalaria inválida.');
  }
  const filtros: string[] = [];
  const valores: unknown[] = [new Date().toISOString()];
  if (estado) { valores.push(estado); filtros.push(`hosp.estado=$${valores.length}`); }
  if (pacienteId) { valores.push(pacienteId); filtros.push(`p.id_publico=$${valores.length}`); }
  // SQL extracts only the diagnosis summary; notes/procedures never cross this listing boundary.
  const seleccion = SQL_HOSPITAL.replaceAll('__AHORA__', '$1::timestamp').replace('hosp.observaciones,', `CASE
    WHEN pg_input_is_valid(hosp.observaciones, 'jsonb') THEN jsonb_build_object(
      'diagnosticoIngresoCIE', hosp.observaciones::jsonb->>'diagnosticoIngresoCIE',
      'diagnosticoIngresoNombre', hosp.observaciones::jsonb->>'diagnosticoIngresoNombre')::text
    ELSE NULL END AS observaciones,`);
  valores.push(pagina.limite + 1, (pagina.pagina - 1) * pagina.limite);
  const filas = await ejecutor.consultar<FilaHospitalizacion>(seleccion +
    (filtros.length ? ' WHERE ' + filtros.join(' AND ') : '') +
    ` ORDER BY hosp.fecha_ingreso DESC, hosp.id_publico DESC LIMIT $${valores.length - 1} OFFSET $${valores.length}`, valores);
  return Object.freeze(filas.filas.map(f => {
    const obs = parsearObservaciones(f.observaciones);
    return Object.freeze({
      id: uuidPublico(f.id_publico), codigoIngreso: `ING-${f.id_hospitalizacion.toString().padStart(6, '0')}`,
      pacienteId: uuidPublico(f.paciente_id_publico), pacienteNombre: f.paciente_nombre.trim(), pacienteExpediente: f.paciente_expediente,
      medicoTratanteId: uuidPublico(f.medico_id_publico), medicoTratanteNombre: f.medico_nombre.trim(), medicoTratanteColegiado: f.medico_colegiado || '',
      fechaIngreso: formatearFechaIso(f.fecha_ingreso)!, fechaEgreso: formatearFechaIso(f.fecha_egreso), estado: f.estado as EstadoHospitalizacion,
      diagnosticoIngresoCIE: obs.diagnosticoIngresoCIE || 'Z00.0', diagnosticoIngresoNombre: obs.diagnosticoIngresoNombre || f.motivo_ingreso,
      motivoIngreso: f.motivo_ingreso, version: versionPositiva(Number(f.revision)),
      camaActual: f.cama_actual_id_publico ? { camaId: uuidPublico(f.cama_actual_id_publico),
        codigoCama: `${f.cama_actual_habitacion}-${f.cama_actual_numero}`, habitacion: `Habitación ${f.cama_actual_habitacion}`,
        servicio: f.cama_actual_servicio || 'Medicina General' } : undefined,
    });
  }));
}
