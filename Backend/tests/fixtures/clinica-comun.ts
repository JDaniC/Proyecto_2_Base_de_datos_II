import { randomUUID } from 'node:crypto';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { instanteUtc } from '../../src/dominio/compartido/instante-utc.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import type { Institucion } from '../../src/dominio/compartido/institucion.js';
import type { Paciente } from '../../src/dominio/clinica/paciente.js';
import type { Cita } from '../../src/dominio/clinica/cita.js';
import type { Consulta, ProfesionalClinico } from '../../src/dominio/clinica/consulta.js';
import { crearContextoAutenticado, type CuentaAutorizada } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../src/aplicacion/puertos/bundle-institucional.js';
import type { AntecedentesClinicos, PuertosClinicos, RevisionCita } from '../../src/aplicacion/puertos/clinica.js';
import { CATALOGO_ODONTOLOGIA_BASE } from '../../src/aplicacion/casos-uso/clinica/consultar-catalogos-clinicos.js';
import type { LectorTransaccional, UnidadDeTrabajo, OperacionIdempotente, RevisionPlanificada, EventoAuditoria, CambioPlanificado } from '../../src/aplicacion/puertos/nucleo.js';
import type { PuertosHospital } from '../../src/aplicacion/puertos/hospital.js';
import type { CamaHospitalaria, Hospitalizacion } from '../../src/dominio/hospital/hospitalizacion.js';

export const nuevoId = () => uuidPublico(randomUUID());
export const ahora = instanteUtc('2026-10-28T18:00:00Z');
export const medicamento = { nombre: 'Medicamento sintético', presentacion: 'Tableta', concentracion: '10 mg', dosis: '1 tableta', frecuencia: 'Cada 24 h', duracion: '3 días', via: 'Oral', indicaciones: 'Indicación sintética' };
export function escenarioClinico(institucion: Institucion) {
  const rol = { HOSPITAL_GENERAL: 'MEDICO', CLINICA_ODONTOLOGICA: 'ODONTOLOGO', LABORATORIO_CLINICO: 'MEDICO_LABORATORIO', CENTRO_MEDICO_PEDIATRICO: 'PEDIATRA' }[institucion] as ProfesionalClinico['rol'];
  let cuenta: CuentaAutorizada = { id: nuevoId(), uid: 'clinico-sintetico', institucion, estado: 'ACTIVA', roles: [rol],
    permisos: ['historial.leer', 'consultas.registrar', 'diagnosticos.registrar', 'tratamientos.registrar', 'recetas.emitir', 'citas.administrar'],
    version: versionPositiva(1), profesional: { id: nuevoId(), activo: true } };
  const contexto = crearContextoAutenticado({ uid: cuenta.uid, institucion, emitidoEn: ahora }, cuenta, nuevoId());
  let profesional: ProfesionalClinico = { id: cuenta.profesional!.id, nombre: 'Profesional sintético', rol, activo: true, tipo: 'INDIVIDUAL', colegiado: 'SINT-1', entidad_colegiacion: 'Entidad sintética' };
  const paciente: Paciente = { id: nuevoId(), codigoLegible: 'SINT', institucion, nombres: 'Paciente', apellidos: 'Sintético', fechaNacimiento: null, sexo: null, estado: 'ACTIVO', version: versionPositiva(1), fechaRegistro: ahora };
  const responsableId = nuevoId();
  let autorizacion = { activo: true, autorizaAtencion: true, version: versionPositiva(1), documento: { tipo: 'CUI', numero: '1234567890101' }, nombre: 'Responsable sintético' };
  let pacientes = new Map([[paciente.id, paciente]]);
  let citas = new Map<string, Cita>();
  let consultas = new Map<string, Consulta>();
  let antecedentes = new Map<string, AntecedentesClinicos>();
  let operaciones = new Map<string, OperacionIdempotente<unknown>>();
  let revisiones: RevisionPlanificada[] = [];
  let auditoria: EventoAuditoria[] = [];
  let eventos: CambioPlanificado[] = [];
  let cola = Promise.resolve();
  const control = { fallo: '' as '' | 'datos' | 'receta' | 'auditoria', repetirCallback: false };
  const clinica: PuertosClinicos = {
    pacientes: { async porId(id) { return pacientes.get(id) ?? null; } },
    profesionales: {
      async porId(id) { return id === profesional.id ? profesional : null; },
      async listar() { return [profesional]; },
    },
    consultas: {
      async porId(id) { return consultas.get(id) ?? null; },
      async porVersion(id, version) { const vigente = consultas.get(id); if (vigente?.version === version) return vigente;
        return (revisiones.find(r => r.agregado === 'consultas' && r.recursoId === id && r.versionAnterior === version)?.snapshotAnterior as Consulta | undefined) ?? null; },
      async porCita(id) { return [...consultas.values()].find(c => c.cita_id === id) ?? null; },
    },
    citas: { async porId(id) { return citas.get(id) ?? null; },
      async listar() { return { elementos: [...citas.values()] }; },
      async solapamientos(id, fecha, inicio, fin) { return [...citas.values()].filter(c => c.profesional_id === id && c.fecha === fecha && c.hora_inicio < fin && (c.hora_fin ?? '23:59') > inicio && c.estado !== 'CANCELADA'); },
      async revisiones(id, rango, pagina) {
        const items: RevisionCita[] = revisiones
          .filter(r => r.agregado === 'citas' && r.recursoId === id)
          .map(r => {
            const snap = r.snapshotAnterior as Record<string, unknown>;
            return {
              id: r.id,
              version: r.versionAnterior,
              fecha_hora: String(snap.fecha_hora ?? ahora),
              actor_id: uuidPublico(snap.actor_id ?? cuenta.id),
              motivo_cambio: String(snap.motivo_cambio ?? r.motivo ?? ''),
              anterior: snap.anterior as Cita,
              actual: snap.actual as Cita,
            };
          })
          .filter(item => (!rango.desde || item.fecha_hora >= rango.desde) && (!rango.hasta || item.fecha_hora < rango.hasta));
        if (pagina.orden === 'DESC') items.reverse();
        return { elementos: items.slice(0, pagina.limite) };
      } },
    antecedentes: {
      async porPaciente(id) {
        return antecedentes.get(id) ?? {
          patologicos: [],
          quirurgicos: [],
          familiares: [],
          alergias: [],
          medicamentos_actuales: [],
          registros: [],
        };
      },
    },
    catalogos: {
      async odontologia() {
        return CATALOGO_ODONTOLOGIA_BASE;
      },
    },
    responsables: { async autorizacion(id, responsable) { return id === paciente.id && responsable === responsableId ? autorizacion : null; } },
  };
  const uow: UnidadDeTrabajo = { async ejecutar(contextoActual, comando, planificar) {
    const turno = cola; let liberar!: () => void; cola = new Promise<void>(ok => { liberar = ok; }); await turno;
    try {
      const lector: LectorTransaccional = { clinica,
        pacientes: { ...clinica.pacientes, async porVersion() { throw new Error('PUERTO_NO_USADO'); } },
        citas: clinica.citas, consultas: clinica.consultas, profesionales: clinica.profesionales,
        identidades: { async titular() { throw new Error('PUERTO_NO_USADO'); } },
        responsables: { async porId() { throw new Error('PUERTO_NO_USADO'); }, async porPaciente() { throw new Error('PUERTO_NO_USADO'); } },
        historial: { async eventos() { throw new Error('PUERTO_NO_USADO'); } },
        cuentas: { async porUid() { return cuenta; } }, operaciones: {
        async porClave<T>(actor: string, caso: string, clave: string) { return (operaciones.get(`${actor}:${caso}:${clave}`) as OperacionIdempotente<T> | undefined) ?? null; },
      } };
      if (control.repetirCallback) await planificar(lector);
      const plan = await planificar(lector);
      if (plan.tipo === 'REPETIR') return plan.operacion.resultado;
      const nuevosPacientes = new Map(pacientes), nuevasCitas = new Map(citas), nuevasConsultas = new Map(consultas), nuevosAntecedentes = new Map(antecedentes);
      for (const cambio of plan.cambios) {
        if (cambio.agregado === 'antecedentes') {
          nuevosAntecedentes.set(cambio.recursoId, structuredClone(cambio.nuevoEstado as AntecedentesClinicos));
          if (control.fallo === 'datos') throw new Error('FALLO_DATOS_SINTETICO');
          continue;
        }
        const mapa = (cambio.agregado === 'pacientes' || cambio.agregado === 'estadoHistorial') ? nuevosPacientes : cambio.agregado === 'citas' ? nuevasCitas : cambio.agregado === 'consultas' ? nuevasConsultas : null;
        if (mapa) {
          const anterior = mapa.get(cambio.recursoId);
          if (cambio.versionAnterior !== null && anterior?.version !== cambio.versionAnterior) throw new ErrorDominio('VERSION_DESACTUALIZADA', 'Versión cambió.');
          // Solo el adaptador sintético aplica el plan a copias; nunca se usa como fallback de producción.
          (mapa as Map<string, unknown>).set(cambio.recursoId, structuredClone(cambio.nuevoEstado));
        }
        if (control.fallo === 'datos') throw new Error('FALLO_DATOS_SINTETICO');
      }
      if (control.fallo === 'receta' && plan.cambios.some(c => c.agregado === 'consultas' && (c.nuevoEstado as Consulta).receta)) throw new Error('FALLO_RECETA_SINTETICO');
      if (control.fallo === 'auditoria') throw new Error('FALLO_AUDITORIA_SINTETICO');
      pacientes = nuevosPacientes; citas = nuevasCitas; consultas = nuevasConsultas; antecedentes = nuevosAntecedentes;
      revisiones = [...revisiones, ...structuredClone(plan.revisiones)]; auditoria = [...auditoria, ...structuredClone(plan.auditoria)];
      eventos = [...eventos, ...structuredClone(plan.cambios.filter(c => c.agregado === 'eventosHistorial'))];
      operaciones = new Map(operaciones).set(`${contextoActual.cuenta.id}:${comando.caso}:${comando.claveIdempotencia}`, { hashEntrada: comando.hashEntrada, resultado: structuredClone(plan.resultado) });
      return plan.resultado;
    } finally { liberar(); }
  } };
  const camasHospital = new Map<string, CamaHospitalaria>();
  const hospHospital = new Map<string, Hospitalizacion>();

  const camaDemoId = nuevoId();
  const camaDemo: CamaHospitalaria = {
    id: camaDemoId,
    habitacionId: nuevoId(),
    numeroHabitacion: '201',
    piso: 2,
    salaServicio: 'Medicina General',
    codigoCama: '201-A',
    estado: 'DISPONIBLE',
    version: versionPositiva(1),
  };
  camasHospital.set(camaDemo.id, camaDemo);

  const hospital: PuertosHospital = {
    camas: {
      async listar() { return Object.freeze([...camasHospital.values()]); },
      async porId(id) { return camasHospital.get(id) ?? null; },
    },
    hospitalizaciones: {
      async porId(id) { return hospHospital.get(id) ?? null; },
      async listar(filtroEstado) {
        let lista = [...hospHospital.values()];
        if (filtroEstado) lista = lista.filter((h) => h.estado === filtroEstado);
        return Object.freeze(lista);
      },
      async porPaciente(pacienteId) {
        return Object.freeze([...hospHospital.values()].filter((h) => h.pacienteId === pacienteId));
      },
      async ingresar(params, medicoResponsableId) {
        const cama = camasHospital.get(params.camaId);
        if (!cama) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Cama no encontrada');
        if (cama.estado !== 'DISPONIBLE') throw new ErrorDominio('ESTADO_INVALIDO', 'Cama ocupada');
        const nuevaCama: CamaHospitalaria = { ...cama, estado: 'OCUPADA', hospitalizacionActivaId: nuevoId(), pacienteActual: paciente.nombres };
        camasHospital.set(cama.id, nuevaCama);

        const idHosp = nuevoId();
        const nuevaHosp: Hospitalizacion = {
          id: idHosp,
          codigoIngreso: 'ING-000001',
          pacienteId: params.pacienteId,
          pacienteNombre: `${paciente.nombres} ${paciente.apellidos}`,
          pacienteExpediente: 'EXP-001',
          medicoTratanteId: medicoResponsableId,
          medicoTratanteNombre: profesional.nombre,
          medicoTratanteColegiado: profesional.colegiado || '',
          fechaIngreso: '2026-10-31T20:00:00Z',
          estado: 'ACTIVA',
          diagnosticoIngresoCIE: params.diagnosticoIngresoCIE,
          diagnosticoIngresoNombre: params.diagnosticoIngresoNombre,
          motivoIngreso: params.motivoIngreso,
          camaActual: {
            camaId: cama.id,
            codigoCama: cama.codigoCama,
            habitacion: `Habitación ${cama.numeroHabitacion}`,
            servicio: cama.salaServicio,
          },
          asignacionesCama: [{
            id: nuevoId(),
            camaId: cama.id,
            codigoCama: cama.codigoCama,
            habitacion: `Habitación ${cama.numeroHabitacion}`,
            servicio: cama.salaServicio,
            fechaInicio: '2026-10-31T20:00:00Z',
            version: versionPositiva(1),
          }],
          consultasEnlazadasIds: params.consultasEnlazadasIds || [],
          notasEvolucion: [],
          procedimientos: [],
          version: versionPositiva(1),
        };
        hospHospital.set(nuevaHosp.id, nuevaHosp);
        return nuevaHosp;
      },
      async egresar(params) {
        const hosp = hospHospital.get(params.hospitalizacionId);
        if (!hosp) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Hospitalización no encontrada');
        if (hosp.estado !== 'ACTIVA') throw new ErrorDominio('ESTADO_INVALIDO', 'No está activa');
        const egresada: Hospitalizacion = {
          ...hosp,
          estado: 'FINALIZADA',
          fechaEgreso: params.fechaEgreso,
          diagnosticoEgresoCIE: params.diagnosticoEgresoCIE,
          diagnosticoEgresoNombre: params.diagnosticoEgresoNombre,
          tipoEgreso: params.tipoEgreso,
          resumenEgreso: params.resumenClinico,
          camaActual: undefined,
          version: versionPositiva(hosp.version + 1),
        };
        hospHospital.set(egresada.id, egresada);
        return egresada;
      },
      async asignarCama(params) {
        const hosp = hospHospital.get(params.hospitalizacionId);
        if (!hosp) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Hospitalización no encontrada');
        const camaDest = camasHospital.get(params.nuevaCamaId);
        if (!camaDest) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Cama destino no encontrada');
        const actualizada: Hospitalizacion = {
          ...hosp,
          camaActual: {
            camaId: camaDest.id,
            codigoCama: camaDest.codigoCama,
            habitacion: `Habitación ${camaDest.numeroHabitacion}`,
            servicio: camaDest.salaServicio,
          },
          version: versionPositiva(hosp.version + 1),
        };
        hospHospital.set(actualizada.id, actualizada);
        return actualizada;
      },
      async liberarCama(params) {
        const hosp = hospHospital.get(params.hospitalizacionId);
        if (!hosp) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Hospitalización no encontrada');
        const actualizada: Hospitalizacion = {
          ...hosp,
          camaActual: undefined,
          version: versionPositiva(hosp.version + 1),
        };
        hospHospital.set(actualizada.id, actualizada);
        return actualizada;
      },
      async agregarNotaEvolucion(params, medico) {
        const hosp = hospHospital.get(params.hospitalizacionId);
        if (!hosp) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Hospitalización no encontrada');
        const actualizada: Hospitalizacion = {
          ...hosp,
          notasEvolucion: [{
            id: nuevoId(),
            fechaHora: '2026-10-31T21:00:00Z',
            medicoNombre: medico.nombre,
            medicoColegiado: medico.colegiado,
            notaClinica: params.notaClinica,
            planTerapeutico: params.planTerapeutico,
          }, ...hosp.notasEvolucion],
          version: versionPositiva(hosp.version + 1),
        };
        hospHospital.set(actualizada.id, actualizada);
        return actualizada;
      },
      async agregarProcedimiento(params, prof) {
        const hosp = hospHospital.get(params.hospitalizacionId);
        if (!hosp) throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Hospitalización no encontrada');
        const actualizada: Hospitalizacion = {
          ...hosp,
          procedimientos: [{
            id: nuevoId(),
            nombre: params.nombre,
            resultado: params.resultado,
            codigo: params.codigo,
            fechaHora: '2026-10-31T21:30:00Z',
            profesionalNombre: prof.nombre,
            observaciones: params.observaciones,
          }, ...hosp.procedimientos],
          version: versionPositiva(hosp.version + 1),
        };
        hospHospital.set(actualizada.id, actualizada);
        return actualizada;
      },
    },
  };

  const bundle: BundleInstitucional = { institucion, estadoPersistencia: 'DISPONIBLE', clinica, uow,
    ...(institucion === 'HOSPITAL_GENERAL' ? { hospital } : {}),
    cuenta: { async porUid() { return cuenta; } } };
  const cita: Cita = { id: nuevoId(), paciente_id: paciente.id, profesional_id: profesional.id, fecha: '2026-10-28', hora_inicio: '10:00', hora_fin: '10:30', duracion_minutos: 30, motivo: 'Control', estado: 'PROGRAMADA', version: versionPositiva(1), fecha_creacion: ahora };
  citas.set(cita.id, cita);
  const entrada = { paciente_id: paciente.id, version_paciente: 1, motivo: 'Atención sintética', sintomas: '', signos_vitales: { temperatura_c: 36.7 }, diagnosticos: [{ codigo_cie: 'SINT', nombre: 'Diagnóstico sintético', es_principal: true }], tratamientos: [{ descripcion: 'Tratamiento sintético', indicaciones: 'Conservar' }], receta: { medicamentos: [medicamento] },
    ...(institucion === 'CLINICA_ODONTOLOGICA' ? { cita_id: cita.id, version_cita: 1 } : {}),
    ...(institucion === 'CENTRO_MEDICO_PEDIATRICO' ? { responsable_id: responsableId, version_vinculo: 1 } : {}) };
  return { contexto, bundle, paciente, cita, responsableId, entrada, control,
    camaDemoId,
    get camasHospital() { return camasHospital; },
    get hospHospital() { return hospHospital; },
    get pacientes() { return pacientes; }, get citas() { return citas; }, get consultas() { return consultas; }, get operaciones() { return operaciones; },
    get auditoria() { return auditoria; }, get revisiones() { return revisiones; }, get eventos() { return eventos; },
    get cuenta() { return cuenta; }, set cuenta(c: CuentaAutorizada) { cuenta = c; },
    get profesional() { return profesional; }, set profesional(p: ProfesionalClinico) { profesional = p; },
    get autorizacion() { return autorizacion; }, set autorizacion(a: typeof autorizacion) { autorizacion = a; },
  };
}
