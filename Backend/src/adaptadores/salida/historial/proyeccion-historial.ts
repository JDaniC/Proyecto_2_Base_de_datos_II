import { tiposInstitucion, type EventoHistorial } from '../../../aplicacion/puertos/historial.js';
import { normalizarInstante } from '../../../aplicacion/casos-uso/historiales/consultar-historial.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import type { Institucion } from '../../../dominio/compartido/institucion.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';

/** Contrato cerrado de la proyección, reutilizable por futuros escritores transaccionales. */
export function validarEventoHistorial(valor: unknown, institucion: Institucion): EventoHistorial {
  try {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error();
    const e = valor as EventoHistorial;
    if (Object.keys(e).some((k) => !['id', 'fechaHora', 'tipo', 'recursoId', 'titulo', 'consultaId', 'versionConsulta', 'profesional'].includes(k))) throw new Error();
    if (!tiposInstitucion(institucion).includes(e.tipo) || typeof e.titulo !== 'string' || !e.titulo.trim() || e.titulo.length > 200) throw new Error();
    const clinico = ['CONSULTA', 'DIAGNOSTICO', 'TRATAMIENTO', 'RECETA'].includes(e.tipo);
    if (clinico) versionPositiva(e.versionConsulta);
    else if (e.versionConsulta !== undefined) throw new Error();
    if (['DIAGNOSTICO', 'TRATAMIENTO', 'RECETA'].includes(e.tipo) && e.consultaId === undefined) throw new Error();
    if (e.tipo === 'CONSULTA' && e.consultaId !== undefined && uuidPublico(e.consultaId) !== uuidPublico(e.recursoId)) throw new Error();
    let profesional: EventoHistorial['profesional'];
    if (e.profesional !== undefined) {
      const p = e.profesional;
      if (!p || typeof p !== 'object' || Object.keys(p).some((k) => !['id', 'nombre', 'rol', 'activo'].includes(k)) ||
        typeof p.nombre !== 'string' || !p.nombre.trim() || p.nombre.length > 200 || p.activo !== true ||
        !['MEDICO', 'ODONTOLOGO', 'PEDIATRA', 'MEDICO_LABORATORIO', 'ANALISTA_LABORATORIO', 'VALIDADOR_LABORATORIO'].includes(p.rol)) throw new Error();
      profesional = Object.freeze({ id: uuidPublico(p.id), nombre: p.nombre, rol: p.rol, activo: true });
    }
    return Object.freeze({ id: uuidPublico(e.id), fechaHora: normalizarInstante(e.fechaHora), tipo: e.tipo,
      recursoId: uuidPublico(e.recursoId), titulo: e.titulo,
      ...(e.consultaId === undefined ? {} : { consultaId: uuidPublico(e.consultaId) }),
      ...(e.versionConsulta === undefined ? {} : { versionConsulta: versionPositiva(e.versionConsulta) }),
      ...(profesional === undefined ? {} : { profesional }) });
  } catch { throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La proyección del historial requiere reconciliación compatible.'); }
}
export function verificarManifiestoHistorial(valor: unknown): void {
  const m = valor as { version?: unknown; estado?: unknown } | null;
  if (!m || m.version !== 1 || m.estado !== 'LISTO') throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'El historial requiere preparación o reconciliación de datos legados.');
}

export function leerProyeccion(valor: unknown, institucion: Institucion, esperado: { id: unknown; tipo: unknown; fecha_hora: unknown }): EventoHistorial {
  const evento = validarEventoHistorial(typeof valor === 'string' ? JSON.parse(valor) : valor, institucion);
  if (evento.id !== esperado.id || evento.tipo !== esperado.tipo || evento.fechaHora !== esperado.fecha_hora) {
    throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'La proyección no coincide con su índice.');
  }
  return evento;
}
