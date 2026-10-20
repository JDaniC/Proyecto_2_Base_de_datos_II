import { randomUUID } from 'node:crypto';
import { INSTITUCION, MAX_DOCUMENTO, modelos, idAplicacion, claveUnica, claveOperacion } from '../firebase/modelo_pediatrico.mjs';

export function crearFixtures() {
  const p = randomUUID(), r = randomUUID(), medico = randomUUID(), cita = randomUUID(), consulta = randomUUID();
  const vacuna = randomUUID(), version = randomUUID(), dosis = randomUUID(), actor = randomUUID(), correlacion = randomUUID();
  const fecha = new Date('2026-10-19T12:00:00Z');
  const aplicacion = idAplicacion(p, vacuna, dosis);
  const dato = (v) => ({ revision: 1, ...v });
  const identidad = dato({ tipo_documento: 'PRUEBA', numero_documento: 'DOCUMENTO-SINTETICO', recurso_id: p, fecha_registro: fecha });
  const clave = claveUnica(identidad.tipo_documento, identidad.numero_documento);
  const operacion = dato({ institucion_id: INSTITUCION, usuario_id: actor, caso_uso: 'PRUEBA', clave: 'CLAVE-SINTETICA',
    hash_entrada: 'a'.repeat(64), recurso_tipo: 'pacientes', recurso_id: p, fecha_hora: fecha, codigo_respuesta: 201, estado: 'CONFIRMADA',
    respuesta: { data: { paciente_id: p }, meta: { correlacion } } });
  const claveOp = claveOperacion(INSTITUCION, actor, operacion.caso_uso, operacion.clave);
  const historico = dato({ version: 1, actor_id: actor, fecha_hora: fecha, motivo: 'MOTIVO-SINTETICO', contenido_anterior: { observaciones: 'PRUEBA' } });
  const filas = [
    [`pacientes/${p}`, dato({ nombres: 'PacienteSintetico', apellidos: 'Prueba', nombre_busqueda: 'pacientesintetico prueba',
      fecha_nacimiento: '2020-01-01', estado: 'ACTIVO', fecha_apertura: fecha })],
    [`responsables/${r}`, dato({ identificacion: 'RESPONSABLE-SINTETICO', tipo_documento: 'PRUEBA', nombres: 'ResponsableSintetico',
      apellidos: 'Prueba', telefono: 'TELEFONO-SINTETICO', fecha_registro: fecha })],
    [`pacientes/${p}/responsables/${r}`, dato({ responsable_id: r, parentesco: 'PARENTESCO-SINTETICO', es_principal: true,
      autoriza_atencion: true, estado: 'ACTIVO', fecha_registro: fecha, actor_id: actor })],
    [`pacientes/${p}/alergias/${randomUUID()}`, dato({ nombre: 'AlergiaSintetica', tipo: 'PRUEBA', reaccion: 'PRUEBA',
      severidad: 'PRUEBA', estado: 'ACTIVA', fecha_registro: fecha })],
    [`pacientes/${p}/antecedentes/${randomUUID()}`, dato({ tipo: 'PRUEBA', descripcion: 'AntecedenteSintetico', fecha_registro: fecha })],
    [`pacientes/${p}/esquemas/${vacuna}`, dato({ vacuna_id: vacuna, version_id: version, actor_id: actor, fecha_asignacion: fecha, estado: 'ACTIVO' })],
    [`pediatras/${medico}`, dato({ nombres: 'ProfesionalSintetico', apellidos: 'Prueba', colegiado: 'COLEGIADO-SINTETICO',
      entidad_colegiacion: 'ENTIDAD-SINTETICA', especialidad: 'ESPECIALIDAD-SINTETICA', estado: 'ACTIVO' })],
    [`citas/${cita}`, dato({ paciente_id: p, pediatra_id: medico, fecha_hora: fecha, motivo: 'MOTIVO-SINTETICO', estado: 'PROGRAMADA', fecha_creacion: fecha })],
    [`consultas/${consulta}`, dato({ paciente_id: p, cita_id: cita, pediatra_id: medico, fecha_hora: fecha,
      motivo: 'MOTIVO-SINTETICO', estado: 'ABIERTA', autorizacion_historica: { responsable_id: r, identificacion: 'RESPONSABLE-SINTETICO',
        nombre: 'ResponsableSintetico Prueba', fecha, autoriza_atencion: true },
      control_crecimiento: { peso_kg: 1, talla_cm: 1 },
      diagnosticos: [{ diagnostico_id: randomUUID(), codigo: 'CODIGO-SINTETICO', nombre: 'DiagnosticoSintetico', es_principal: true }],
      tratamientos: [{ tratamiento_id: randomUUID(), nombre: 'TratamientoSintetico', fecha_inicio: fecha, fecha_fin: fecha }],
      receta: { receta_id: randomUUID(), version: 1, estado: 'EMITIDA', fecha_emision: fecha, prescriptor_id: medico,
        prescriptor_nombre_historico: 'ProfesionalSintetico Prueba', colegiado_historico: 'COLEGIADO-SINTETICO',
        medicamentos: [{ medicamento_id: randomUUID(), nombre: 'ProductoSintetico', presentacion: 'PRUEBA', concentracion: 'PRUEBA',
          dosis: 'PRUEBA', frecuencia: 'PRUEBA', duracion: 'PRUEBA', via: 'PRUEBA', indicaciones: 'DATOS-SINTETICOS' }] } })],
    [`consultas/${consulta}/versiones/${randomUUID()}`, historico],
    [`vacunas/${vacuna}`, dato({ nombre: 'VacunaSintetica', enfermedad_objetivo: 'PRUEBA', fabricante: 'FABRICANTE-SINTETICO', version_vigente: version })],
    [`vacunas/${vacuna}/versiones/${version}`, dato({ version: 1, nombre: 'VacunaSintetica', enfermedad_objetivo: 'PRUEBA',
      fabricante: 'FABRICANTE-SINTETICO', fecha_creacion: fecha, dosis: [{ dosis_id: dosis, numero: 1, edad_recomendada_meses: 0 }] })],
    [`aplicaciones_vacuna/${aplicacion}`, dato({ paciente_id: p, vacuna_id: vacuna, dosis_id: dosis, version_esquema_id: version,
      pediatra_id: medico, fecha_aplicacion: fecha, lote: 'LOTE-SINTETICO', sitio_aplicacion: 'SITIO-SINTETICO', estado: 'APLICADA' })],
    [`aplicaciones_vacuna/${aplicacion}/versiones/${randomUUID()}`, historico],
    [`usuarios/${actor}`, dato({ auth_uid: 'UID-FIREBASE-SINTETICO', proveedor_identidad: 'FIREBASE', institucion_id: INSTITUCION,
      estado: 'ACTIVO', rol_ids: [randomUUID()], pediatra_id: medico, nombre_usuario: 'USUARIO-SINTETICO' })],
    [`roles/${randomUUID()}`, dato({ nombre: 'ROL-SINTETICO', descripcion: 'ROL-DE-PRUEBA', permisos: ['historial.leer'] })],
    [`auditoria/${randomUUID()}`, dato({ usuario_id: actor, auth_uid: 'UID-FIREBASE-SINTETICO', institucion_id: INSTITUCION,
      fecha_hora: fecha, accion: 'PRUEBA', tipo_recurso: 'pacientes', recurso_id: p, correlacion })],
    [`operaciones/${claveOp}`, operacion],
    [`identidades_paciente/${clave}`, identidad],
    [`identidades_responsable/${clave}`, dato({ ...identidad, recurso_id: r })],
    [`colegiados/${claveUnica('ENTIDAD-SINTETICA', 'COLEGIADO-SINTETICO')}`, dato({ entidad_colegiacion: 'ENTIDAD-SINTETICA',
      colegiado: 'COLEGIADO-SINTETICO', pediatra_id: medico, fecha_registro: fecha })],
    ['configuracion/modelo', dato({ version_esquema: 1, institucion_id: INSTITUCION, hash_modelo: 'a'.repeat(64),
      rutas: modelos.map((m) => m.ruta), limite_documento_bytes: MAX_DOCUMENTO, limite_lista: 100, fecha_creacion: fecha })],
  ];
  return { filas, ids: { paciente: p, responsable: r, medico, cita, consulta, vacuna, version, dosis, actor, aplicacion }, fecha };
}
