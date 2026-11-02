import { serializarJCS } from '../../../../dominio/compartido/json-canonico.js';
import { createHash, randomUUID } from 'node:crypto';
import type { PuertosHospital, ComandoHospital } from '../../../../aplicacion/puertos/hospital.js';
import type { LectorTransaccional } from '../../../../aplicacion/puertos/nucleo.js';
import type { Hospitalizacion } from '../../../../dominio/hospital/hospitalizacion.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { instanteUtc } from '../../../../dominio/compartido/instante-utc.js';
import { crearUnidadDeTrabajoSql } from '../../sql/unidad-de-trabajo-sql.js';
import type { PoolSql, EjecutorSql } from '../../sql/tipos-sql.js';
import { crearRepositorioCuentaPostgresql } from '../repositorio-cuenta-postgresql.js';
import { crearPuertosHospitalPostgresql } from './puertos-hospital-postgresql.js';

/** Cada comando usa la UoW SQL existente: misma conexión, revisión, auditoría y resultado durable. */
export function crearHospitalTransaccionalPostgresql(pool: PoolSql): PuertosHospital {
  const lectura = crearPuertosHospitalPostgresql(pool);
  async function ejecutar(
    caso: string, parametros: { comando: ComandoHospital; hospitalizacionId?: string },
    actor: string, operar: (puertos: PuertosHospital) => Promise<Hospitalizacion>,
  ): Promise<Hospitalizacion> {
    const { comando: meta, ...entrada } = parametros;
    const clave = uuidPublico(meta.clave, 'Idempotency-Key');
    const contexto = meta.contexto;
    const id = uuidPublico(randomUUID());
    const fecha = instanteUtc(new Date().toISOString());
    const estable = { instante: fecha, hospitalizacionId: randomUUID(), asignacionId: randomUUID(), detalleId: randomUUID() };
    const hash = createHash('sha256').update(serializarJCS(JSON.parse(JSON.stringify({ entrada, actor })))).digest('hex');
    const uow = crearUnidadDeTrabajoSql({
      dialecto: 'postgresql', pool, serializarClavePostgresql: true,
      crearLector: executor => ({ cuentas: crearRepositorioCuentaPostgresql(executor), executor } as unknown as LectorTransaccional),
      aplicarCambios: async () => {},
    });
    const resultado = await uow.ejecutar<Hospitalizacion>(contexto, {
      id, claveIdempotencia: clave, caso, hashEntrada: hash, instante: fecha, ids: {},
    }, async lector => {
      const executor = (lector as unknown as { executor: EjecutorSql }).executor;
      const cuenta = await crearRepositorioCuentaPostgresql(executor).porUid(contexto.identidad.uid);
      if (!cuenta || cuenta.id !== contexto.cuenta.id || cuenta.estado !== 'ACTIVA' ||
          cuenta.institucion !== 'HOSPITAL_GENERAL' || cuenta.version !== contexto.cuenta.version ||
          !cuenta.permisos.includes('historial.leer') || !cuenta.permisos.includes('consultas.registrar') ||
          !cuenta.profesional?.activo || cuenta.profesional.id !== contexto.cuenta.profesional?.id) {
        throw new ErrorDominio('SIN_PERMISO', 'La autorización clínica ya no está vigente.');
      }
      const modelo = await executor.consultar<{ estado: string }>('SELECT estado FROM hospital_historial.modelo WHERE id=1');
      if (modelo.filas[0]?.estado !== 'LISTO') throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La proyección requiere preparación.');
      // Serializa también la lectura del snapshot anterior antes de cualquier cambio.
      if (parametros.hospitalizacionId) await executor.consultar(
        'SELECT id_hospitalizacion FROM hospitalizacion WHERE id_publico=$1 FOR UPDATE', [parametros.hospitalizacionId]);
      const puertos = crearPuertosHospitalPostgresql(executor, estable);
      const anterior = parametros.hospitalizacionId ? await puertos.hospitalizaciones.porId(uuidPublico(parametros.hospitalizacionId)) : null;
      const respuesta = await operar(puertos);
      await executor.consultar(`UPDATE cama SET revision=revision+1 WHERE id_publico=ANY($1::uuid[])`,
        [[...new Set([anterior?.camaActual?.camaId, respuesta.camaActual?.camaId, respuesta.asignacionesCama.at(-1)?.camaId].filter(Boolean))]]);
      const fechaNanos = fecha.replace(/\.(\d+)Z$/, (_, fraccion: string) => `.${fraccion.padEnd(9, '0')}Z`);
      await executor.consultar(
        `INSERT INTO hospital_historial.eventos(id,paciente_id,tipo,fecha_hora,contenido) VALUES($1,$2,'HOSPITALIZACION',$3,$4::jsonb)`,
        [id, respuesta.pacienteId, fechaNanos, JSON.stringify({ id, fechaHora: fechaNanos, tipo: 'HOSPITALIZACION',
          recursoId: respuesta.id, titulo: caso === 'hospital.ingresar' ? 'Ingreso hospitalario' : caso === 'hospital.egresar' ? 'Egreso hospitalario' : 'Actualización de hospitalización' })]);
      return {
        tipo: 'CONFIRMAR', cambios: [],
        revisiones: anterior ? [{ id, agregado: 'hospitalizaciones', recursoId: anterior.id,
          versionAnterior: anterior.version, snapshotAnterior: anterior }] : [],
        auditoria: [{ id, actorId: cuenta.id, caso, recursoId: respuesta.id, fechaHora: fecha, correlacion: contexto.correlacion }],
        resultado: { httpStatus: 201, respuesta, correlacionOriginal: contexto.correlacion },
      };
    });
    return resultado.respuesta;
  }
  return { camas: lectura.camas, hospitalizaciones: {
    ...lectura.hospitalizaciones,
    ingresar: (p, a) => ejecutar('hospital.ingresar', p, a, h => h.hospitalizaciones.ingresar(p, a)),
    egresar: (p, a) => ejecutar('hospital.egresar', p, a, h => h.hospitalizaciones.egresar(p, a)),
    asignarCama: (p, a) => ejecutar('hospital.asignarCama', p, a, h => h.hospitalizaciones.asignarCama(p, a)),
    liberarCama: (p, a) => ejecutar('hospital.liberarCama', p, a, h => h.hospitalizaciones.liberarCama(p, a)),
    agregarNotaEvolucion: (p, a) => ejecutar('hospital.nota', p, a.id, h => h.hospitalizaciones.agregarNotaEvolucion(p, a)),
    agregarProcedimiento: (p, a) => ejecutar('hospital.procedimiento', p, a.id, h => h.hospitalizaciones.agregarProcedimiento(p, a)),
  } };
}
