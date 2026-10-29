import type { Consulta } from '../../../../dominio/clinica/consulta.js';

/** Autorización completa permanece histórica en servidor; el HTTP publica solo el ID. */
export function proyectarConsulta(c: Consulta) {
  return { id: c.id, paciente_id: c.paciente_id, fecha_hora: c.fecha_hora,
    profesional: { id: c.profesional.id, nombre: c.profesional.nombre, rol: c.profesional.rol, activo: true },
    estado: c.estado, version: c.version, motivo: c.motivo, sintomas: c.sintomas,
    signos_vitales: c.signos_vitales, diagnosticos: c.diagnosticos, tratamientos: c.tratamientos,
    ...(c.cita_id ? { cita_id: c.cita_id } : {}), ...(c.responsable_id ? { responsable_id: c.responsable_id } : {}),
    ...(c.observaciones === undefined ? {} : { observaciones: c.observaciones }), ...(c.receta ? { receta: c.receta } : {}) };
}
