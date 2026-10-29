import type { Consulta } from '../../../../dominio/clinica/consulta.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { validarSignos, validarTamanoClinico } from '../../../../dominio/clinica/consulta.js';
import { validarDocumento } from '../validador-firestore.js';

export function documentoConsultaFirestore(c: Consulta): Record<string, unknown> {
  if (!c.autorizacion || c.responsable_id !== c.autorizacion.responsable_id) throw new ErrorDominio('ESTADO_INVALIDO', 'Autorización histórica incompatible.');
  validarSignos(c.signos_vitales, 'CENTRO_MEDICO_PEDIATRICO'); validarTamanoClinico(c);
  const a = c.autorizacion;
  const crecimiento = Object.fromEntries(Object.entries(c.signos_vitales)
    .filter(([k,v]) => ['peso_kg','talla_cm','perimetro_cefalico_cm','temperatura_c','frecuencia_cardiaca_lpm'].includes(k) && v !== null)
    .map(([k,v]) => [k === 'frecuencia_cardiaca_lpm' ? 'frecuencia_cardiaca' : k,v]));
  const doc = validarDocumento<Record<string,unknown>>(`consultas/${c.id}`, {
    revision: c.version, paciente_id: c.paciente_id, pediatra_id: c.profesional.id,
    ...(c.cita_id ? {cita_id: c.cita_id} : {}), fecha_hora: new Date(c.fecha_hora), motivo: c.motivo,
    ...(c.sintomas.trim() ? {sintomas: c.sintomas} : {}), ...(c.observaciones?.trim() ? {observaciones: c.observaciones} : {}), estado: c.estado,
    autorizacion_historica: {responsable_id: a.responsable_id, identificacion: `${a.identificacion_historica.tipo}:${a.identificacion_historica.numero}`,
      nombre: a.nombre_historico, fecha: new Date(a.fecha_hora), autoriza_atencion: true},
    ...(Object.keys(crecimiento).length ? {control_crecimiento: crecimiento} : {}),
    diagnosticos: c.diagnosticos.map(d => ({diagnostico_id: d.id, codigo: d.codigo_cie, nombre: d.nombre, es_principal: d.es_principal,
      ...(d.observacion?.trim() ? {observaciones: d.observacion} : {})})),
    tratamientos: c.tratamientos.map(t => ({tratamiento_id: t.id, nombre: t.descripcion, indicaciones: t.indicaciones})),
    ...(c.receta ? {receta: {receta_id: c.receta.id, version: c.receta.version, estado: c.receta.estado, fecha_emision: new Date(c.receta.fecha_emision),
      prescriptor_id: c.receta.prescriptor.id, prescriptor_nombre_historico: c.receta.prescriptor.nombre, colegiado_historico: c.receta.prescriptor.colegiado,
      medicamentos: c.receta.medicamentos.map(({id,...m}) => ({medicamento_id: id,...m})),
      ...(c.receta.observaciones?.trim() ? {indicaciones_generales: c.receta.observaciones} : {})}} : {}), signos_vitales: {...c.signos_vitales, ...(Object.keys(c.signos_vitales).length ? {fecha_hora_medicion: new Date(c.fecha_hora)} : {})}, snapshot_v1: c,
  });
  validarTamanoClinico(doc);
  return doc;
}
export function mapearConsultaFirestore(id: string, datos: Record<string, unknown>): Consulta {
  try {
  const validado = validarDocumento<Record<string,unknown>>(`consultas/${id}`,datos);
  const c = validado.snapshot_v1 as Consulta | undefined;
  if (!c || c.id !== id || c.version !== validado.revision) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','Consulta histórica pendiente de reconciliación.');
  const esperado = documentoConsultaFirestore(c);
  // También comprueba que las dos representaciones del documento no diverjan.
  if (JSON.stringify(esperado) !== JSON.stringify(validado)) throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','La proyección clínica es incompatible.');
  return c;
  } catch { throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE','La lectura clínica requiere datos compatibles y reconciliados.'); }
}
