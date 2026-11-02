import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import type { PuertosHospital } from '../../puertos/hospital.js';
import type { Hospitalizacion } from '../../../dominio/hospital/hospitalizacion.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
import { instanteUtc } from '../../../dominio/compartido/instante-utc.js';
import { objetoCerrado, textoClinico } from '../../../dominio/clinica/consulta.js';
import { uuidPublico } from '../../../dominio/compartido/uuid.js';
import { versionPositiva } from '../../../dominio/compartido/version.js';

export interface EntradaIngresoHospitalario {
  readonly pacienteId: string;
  readonly camaId: string;
  readonly motivoIngreso: string;
  readonly diagnosticoIngresoCIE: string;
  readonly diagnosticoIngresoNombre: string;
  readonly consultasEnlazadasIds?: readonly string[];
  readonly versionEsperadaCama?: number;
}

export interface EntradaEgresoHospitalario {
  readonly fechaEgreso: string;
  readonly tipoEgreso: 'ALTA_MEDICA' | 'TRASLADO' | 'VOLUNTARIA' | 'FALLECIMIENTO';
  readonly diagnosticoEgresoCIE: string;
  readonly diagnosticoEgresoNombre: string;
  readonly resumenClinico: string;
  readonly versionEsperada?: number;
}

export interface EntradaAsignarCama {
  readonly nuevaCamaId: string;
  readonly fechaInicio: string;
  readonly motivo?: string;
  readonly versionEsperada?: number;
}

export interface EntradaLiberarCama {
  readonly fechaFin: string;
  readonly versionEsperada?: number;
}

export interface EntradaNotaEvolucion {
  readonly notaClinica: string;
  readonly planTerapeutico?: string;
  readonly versionEsperada?: number;
}

export interface EntradaProcedimientoHospitalario {
  readonly nombre: string;
  readonly resultado: string;
  readonly codigo?: string;
  readonly observaciones?: string;
  readonly versionEsperada?: number;
}

export class GestionarHospitalizaciones {
  async ingresar(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    entrada: EntradaIngresoHospitalario,
    clave?: string,
  ): Promise<Hospitalizacion> {
    objetoCerrado(entrada, ['pacienteId', 'camaId', 'motivoIngreso', 'diagnosticoIngresoCIE', 'diagnosticoIngresoNombre', 'consultasEnlazadasIds', 'versionEsperadaCama']);
    const puertos = this.validarContextoHospital(contexto, bundle);
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) throw new ErrorDominio('SOLICITUD_INVALIDA', 'La entrada debe ser un objeto.');
    const medicoId = contexto.cuenta.profesional?.id;
    if (!medicoId || !contexto.cuenta.profesional?.activo) {
      throw new ErrorDominio('SIN_PERMISO', 'El profesional responsable debe ser un médico activo.');
    }

    textoClinico(entrada.motivoIngreso, 'motivoIngreso', 10000);
    textoClinico(entrada.diagnosticoIngresoCIE, 'diagnosticoIngresoCIE', 20);
    textoClinico(entrada.diagnosticoIngresoNombre, 'diagnosticoIngresoNombre', 200);
    if (entrada.consultasEnlazadasIds !== undefined && (!Array.isArray(entrada.consultasEnlazadasIds) || entrada.consultasEnlazadasIds.length > 100)) {
      throw new ErrorDominio('SOLICITUD_INVALIDA', 'La lista de consultas no es válida.');
    }

    const pacienteId = uuidPublico(entrada.pacienteId);
    const camaId = uuidPublico(entrada.camaId);
    const versionEsperadaCama = versionPositiva(entrada.versionEsperadaCama);
    const consultasEnlazadasIds = entrada.consultasEnlazadasIds?.map((id) => uuidPublico(id));

    return puertos.hospitalizaciones.ingresar({
      comando: this.comando(contexto, clave),
      pacienteId,
      camaId,
      motivoIngreso: entrada.motivoIngreso.trim(),
      diagnosticoIngresoCIE: entrada.diagnosticoIngresoCIE.trim(),
      diagnosticoIngresoNombre: entrada.diagnosticoIngresoNombre?.trim() || entrada.diagnosticoIngresoCIE.trim(),
      ...(consultasEnlazadasIds !== undefined ? { consultasEnlazadasIds } : {}),
      ...(versionEsperadaCama !== undefined ? { versionEsperadaCama } : {}),
    }, medicoId);
  }

  async egresar(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    hospitalizacionId: string,
    entrada: EntradaEgresoHospitalario,
    clave?: string,
  ): Promise<Hospitalizacion> {
    objetoCerrado(entrada, ['fechaEgreso', 'tipoEgreso', 'diagnosticoEgresoCIE', 'diagnosticoEgresoNombre', 'resumenClinico', 'versionEsperada']);
    const puertos = this.validarContextoHospital(contexto, bundle);
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) throw new ErrorDominio('SOLICITUD_INVALIDA', 'La entrada debe ser un objeto.');
    const medicoId = contexto.cuenta.profesional?.id;
    if (!medicoId || !contexto.cuenta.profesional?.activo) {
      throw new ErrorDominio('SIN_PERMISO', 'El profesional responsable del egreso debe ser un médico activo.');
    }

    if (!['ALTA_MEDICA', 'TRASLADO', 'VOLUNTARIA', 'FALLECIMIENTO'].includes(entrada.tipoEgreso) ||
        ![entrada.diagnosticoEgresoCIE, entrada.diagnosticoEgresoNombre, entrada.resumenClinico].every(v => typeof v === 'string' && v.trim().length > 0)) {
      throw new ErrorDominio('SOLICITUD_INVALIDA', 'Complete diagnóstico, resumen y tipo de egreso válido.');
    }
    const hospId = uuidPublico(hospitalizacionId);
    const versionEsperada = versionPositiva(entrada.versionEsperada);

    return puertos.hospitalizaciones.egresar({
      comando: this.comando(contexto, clave),
      hospitalizacionId: hospId,
      fechaEgreso: instanteUtc(entrada.fechaEgreso),
      tipoEgreso: entrada.tipoEgreso,
      diagnosticoEgresoCIE: textoClinico(entrada.diagnosticoEgresoCIE, 'diagnosticoEgresoCIE', 20),
      diagnosticoEgresoNombre: textoClinico(entrada.diagnosticoEgresoNombre, 'diagnosticoEgresoNombre', 200),
      resumenClinico: textoClinico(entrada.resumenClinico, 'resumenClinico', 10000),
      ...(versionEsperada !== undefined ? { versionEsperada } : {}),
    }, medicoId);
  }

  async asignarCama(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    hospitalizacionId: string,
    entrada: EntradaAsignarCama,
    clave?: string,
  ): Promise<Hospitalizacion> {
    objetoCerrado(entrada, ['nuevaCamaId', 'fechaInicio', 'motivo', 'versionEsperada']);
    const puertos = this.validarContextoHospital(contexto, bundle);
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) throw new ErrorDominio('SOLICITUD_INVALIDA', 'La entrada debe ser un objeto.');
    const actorId = contexto.cuenta.id;
    const hospId = uuidPublico(hospitalizacionId);
    const nuevaCamaId = uuidPublico(entrada.nuevaCamaId);
    const versionEsperada = versionPositiva(entrada.versionEsperada);

    return puertos.hospitalizaciones.asignarCama({
      comando: this.comando(contexto, clave),
      hospitalizacionId: hospId,
      nuevaCamaId,
      fechaInicio: instanteUtc(entrada.fechaInicio),
      ...(entrada.motivo !== undefined ? { motivo: textoClinico(entrada.motivo, 'motivo', 1000) } : {}),
      ...(versionEsperada !== undefined ? { versionEsperada } : {}),
    }, actorId);
  }

  async liberarCama(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    hospitalizacionId: string,
    entrada: EntradaLiberarCama,
    clave?: string,
  ): Promise<Hospitalizacion> {
    objetoCerrado(entrada, ['fechaFin', 'versionEsperada']);
    const puertos = this.validarContextoHospital(contexto, bundle);
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) throw new ErrorDominio('SOLICITUD_INVALIDA', 'La entrada debe ser un objeto.');
    const actorId = contexto.cuenta.id;
    const hospId = uuidPublico(hospitalizacionId);
    const versionEsperada = versionPositiva(entrada.versionEsperada);

    return puertos.hospitalizaciones.liberarCama({
      comando: this.comando(contexto, clave),
      hospitalizacionId: hospId,
      fechaFin: instanteUtc(entrada.fechaFin),
      ...(versionEsperada !== undefined ? { versionEsperada } : {}),
    }, actorId);
  }

  async agregarNotaEvolucion(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    hospitalizacionId: string,
    entrada: EntradaNotaEvolucion,
    clave?: string,
  ): Promise<Hospitalizacion> {
    objetoCerrado(entrada, ['notaClinica', 'planTerapeutico', 'versionEsperada']);
    const puertos = this.validarContextoHospital(contexto, bundle);
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) throw new ErrorDominio('SOLICITUD_INVALIDA', 'La entrada debe ser un objeto.');
    const prof = contexto.cuenta.profesional;
    if (!prof || !prof.activo) {
      throw new ErrorDominio('SIN_PERMISO', 'El autor de la nota clínica debe ser un profesional médico activo.');
    }

    const hospId = uuidPublico(hospitalizacionId);
    const versionEsperada = versionPositiva(entrada.versionEsperada);

    return puertos.hospitalizaciones.agregarNotaEvolucion({
      comando: this.comando(contexto, clave),
      hospitalizacionId: hospId,
      notaClinica: textoClinico(entrada.notaClinica, 'notaClinica', 10000),
      ...(entrada.planTerapeutico !== undefined ? { planTerapeutico: textoClinico(entrada.planTerapeutico, 'planTerapeutico', 10000) } : {}),
      ...(versionEsperada !== undefined ? { versionEsperada } : {}),
    }, {
      id: prof.id,
      nombre: (await this.profesional(bundle, prof.id)).nombre,
      colegiado: (await this.profesional(bundle, prof.id)).colegiado,
    });
  }

  async agregarProcedimiento(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    hospitalizacionId: string,
    entrada: EntradaProcedimientoHospitalario,
    clave?: string,
  ): Promise<Hospitalizacion> {
    objetoCerrado(entrada, ['nombre', 'resultado', 'codigo', 'observaciones', 'versionEsperada']);
    const puertos = this.validarContextoHospital(contexto, bundle);
    if (!entrada || typeof entrada !== 'object' || Array.isArray(entrada)) throw new ErrorDominio('SOLICITUD_INVALIDA', 'La entrada debe ser un objeto.');
    const prof = contexto.cuenta.profesional;
    if (!prof || !prof.activo) {
      throw new ErrorDominio('SIN_PERMISO', 'El profesional que registra el procedimiento debe ser un usuario clínico activo.');
    }

    const hospId = uuidPublico(hospitalizacionId);
    const versionEsperada = versionPositiva(entrada.versionEsperada);

    return puertos.hospitalizaciones.agregarProcedimiento({
      comando: this.comando(contexto, clave),
      hospitalizacionId: hospId,
      nombre: textoClinico(entrada.nombre, 'nombre', 200),
      resultado: textoClinico(entrada.resultado, 'resultado', 10000),
      ...(entrada.codigo !== undefined ? { codigo: textoClinico(entrada.codigo, 'codigo', 100) } : {}),
      ...(entrada.observaciones !== undefined ? { observaciones: textoClinico(entrada.observaciones, 'observaciones', 10000) } : {}),
      ...(versionEsperada !== undefined ? { versionEsperada } : {}),
    }, {
      id: prof.id,
      nombre: (await this.profesional(bundle, prof.id)).nombre,
    });
  }

  private async profesional(bundle: BundleInstitucional, id: string) {
    const profesional = await bundle.clinica?.profesionales.porId(uuidPublico(id));
    if (!profesional?.activo) throw new ErrorDominio('SIN_PERMISO', 'Profesional no disponible.');
    return profesional;
  }

  private comando(contexto: ContextoAutenticado, clave?: string) {
    if (typeof clave !== 'string' || !/^[A-Za-z0-9._:-]{8,200}$/.test(clave)) {
      throw new ErrorDominio('SOLICITUD_INVALIDA', 'Se requiere una clave idempotente estable.');
    }
    return { contexto, clave: uuidPublico(clave, 'Idempotency-Key') };
  }

  private validarContextoHospital(contexto: ContextoAutenticado, bundle: BundleInstitucional): PuertosHospital {
    if (!contexto.cuenta.permisos.includes('historial.leer') || !contexto.cuenta.permisos.includes('consultas.registrar')) {
      throw new ErrorDominio('SIN_PERMISO', 'Se requieren permisos clínicos para modificar hospitalizaciones.');
    }
    if (contexto.cuenta.institucion !== 'HOSPITAL_GENERAL' || bundle.institucion !== 'HOSPITAL_GENERAL') {
      throw new ErrorDominio('SIN_PERMISO', 'Capacidad hospitalaria exclusiva de Hospital General.');
    }
    if (!bundle.hospital) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Bundle hospitalario no disponible.');
    }
    return bundle.hospital;
  }
}
