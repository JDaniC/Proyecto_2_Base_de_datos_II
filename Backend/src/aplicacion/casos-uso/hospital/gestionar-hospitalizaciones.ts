import type { ContextoAutenticado } from '../../puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../puertos/bundle-institucional.js';
import type { PuertosHospital } from '../../puertos/hospital.js';
import type { Hospitalizacion } from '../../../dominio/hospital/hospitalizacion.js';
import { ErrorDominio } from '../../../dominio/compartido/error-dominio.js';
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
  ): Promise<Hospitalizacion> {
    const puertos = this.validarContextoHospital(contexto, bundle);
    const medicoId = contexto.cuenta.profesional?.id;
    if (!medicoId || !contexto.cuenta.profesional?.activo) {
      throw new ErrorDominio('SIN_PERMISO', 'El profesional responsable debe ser un médico activo.');
    }

    if (!entrada.pacienteId?.trim() || !entrada.camaId?.trim() || !entrada.motivoIngreso?.trim() || !entrada.diagnosticoIngresoCIE?.trim()) {
      throw new ErrorDominio('SOLICITUD_INVALIDA', 'Datos incompletos para el ingreso hospitalario.');
    }

    const pacienteId = uuidPublico(entrada.pacienteId);
    const camaId = uuidPublico(entrada.camaId);
    const versionEsperadaCama = entrada.versionEsperadaCama !== undefined ? versionPositiva(entrada.versionEsperadaCama) : undefined;
    const consultasEnlazadasIds = entrada.consultasEnlazadasIds?.map((id) => uuidPublico(id));

    return puertos.hospitalizaciones.ingresar({
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
  ): Promise<Hospitalizacion> {
    const puertos = this.validarContextoHospital(contexto, bundle);
    const medicoId = contexto.cuenta.profesional?.id;
    if (!medicoId || !contexto.cuenta.profesional?.activo) {
      throw new ErrorDominio('SIN_PERMISO', 'El profesional responsable del egreso debe ser un médico activo.');
    }

    const hospId = uuidPublico(hospitalizacionId);
    const versionEsperada = entrada.versionEsperada !== undefined ? versionPositiva(entrada.versionEsperada) : undefined;

    return puertos.hospitalizaciones.egresar({
      hospitalizacionId: hospId,
      fechaEgreso: entrada.fechaEgreso,
      tipoEgreso: entrada.tipoEgreso,
      diagnosticoEgresoCIE: entrada.diagnosticoEgresoCIE.trim(),
      diagnosticoEgresoNombre: entrada.diagnosticoEgresoNombre.trim(),
      resumenClinico: entrada.resumenClinico.trim(),
      ...(versionEsperada !== undefined ? { versionEsperada } : {}),
    }, medicoId);
  }

  async asignarCama(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    hospitalizacionId: string,
    entrada: EntradaAsignarCama,
  ): Promise<Hospitalizacion> {
    const puertos = this.validarContextoHospital(contexto, bundle);
    const actorId = contexto.cuenta.id;
    const hospId = uuidPublico(hospitalizacionId);
    const nuevaCamaId = uuidPublico(entrada.nuevaCamaId);
    const versionEsperada = entrada.versionEsperada !== undefined ? versionPositiva(entrada.versionEsperada) : undefined;

    return puertos.hospitalizaciones.asignarCama({
      hospitalizacionId: hospId,
      nuevaCamaId,
      fechaInicio: entrada.fechaInicio,
      ...(entrada.motivo?.trim() !== undefined ? { motivo: entrada.motivo.trim() } : {}),
      ...(versionEsperada !== undefined ? { versionEsperada } : {}),
    }, actorId);
  }

  async liberarCama(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    hospitalizacionId: string,
    entrada: EntradaLiberarCama,
  ): Promise<Hospitalizacion> {
    const puertos = this.validarContextoHospital(contexto, bundle);
    const actorId = contexto.cuenta.id;
    const hospId = uuidPublico(hospitalizacionId);
    const versionEsperada = entrada.versionEsperada !== undefined ? versionPositiva(entrada.versionEsperada) : undefined;

    return puertos.hospitalizaciones.liberarCama({
      hospitalizacionId: hospId,
      fechaFin: entrada.fechaFin,
      ...(versionEsperada !== undefined ? { versionEsperada } : {}),
    }, actorId);
  }

  async agregarNotaEvolucion(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    hospitalizacionId: string,
    entrada: EntradaNotaEvolucion,
  ): Promise<Hospitalizacion> {
    const puertos = this.validarContextoHospital(contexto, bundle);
    const prof = contexto.cuenta.profesional;
    if (!prof || !prof.activo) {
      throw new ErrorDominio('SIN_PERMISO', 'El autor de la nota clínica debe ser un profesional médico activo.');
    }

    const hospId = uuidPublico(hospitalizacionId);
    const versionEsperada = entrada.versionEsperada !== undefined ? versionPositiva(entrada.versionEsperada) : undefined;

    return puertos.hospitalizaciones.agregarNotaEvolucion({
      hospitalizacionId: hospId,
      notaClinica: entrada.notaClinica.trim(),
      ...(entrada.planTerapeutico?.trim() !== undefined ? { planTerapeutico: entrada.planTerapeutico.trim() } : {}),
      ...(versionEsperada !== undefined ? { versionEsperada } : {}),
    }, {
      id: prof.id,
      nombre: 'Médico Tratante',
      colegiado: '',
    });
  }

  async agregarProcedimiento(
    contexto: ContextoAutenticado,
    bundle: BundleInstitucional,
    hospitalizacionId: string,
    entrada: EntradaProcedimientoHospitalario,
  ): Promise<Hospitalizacion> {
    const puertos = this.validarContextoHospital(contexto, bundle);
    const prof = contexto.cuenta.profesional;
    if (!prof || !prof.activo) {
      throw new ErrorDominio('SIN_PERMISO', 'El profesional que registra el procedimiento debe ser un usuario clínico activo.');
    }

    const hospId = uuidPublico(hospitalizacionId);
    const versionEsperada = entrada.versionEsperada !== undefined ? versionPositiva(entrada.versionEsperada) : undefined;

    return puertos.hospitalizaciones.agregarProcedimiento({
      hospitalizacionId: hospId,
      nombre: entrada.nombre.trim(),
      resultado: entrada.resultado.trim(),
      ...(entrada.codigo?.trim() !== undefined ? { codigo: entrada.codigo.trim() } : {}),
      ...(entrada.observaciones?.trim() !== undefined ? { observaciones: entrada.observaciones.trim() } : {}),
      ...(versionEsperada !== undefined ? { versionEsperada } : {}),
    }, {
      id: prof.id,
      nombre: 'Profesional Clínico',
    });
  }

  private validarContextoHospital(contexto: ContextoAutenticado, bundle: BundleInstitucional): PuertosHospital {
    if (contexto.cuenta.institucion !== 'HOSPITAL_GENERAL') {
      throw new ErrorDominio('SIN_PERMISO', 'Capacidad hospitalaria exclusiva de Hospital General.');
    }
    if (!bundle.hospital) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Bundle hospitalario no disponible.');
    }
    return bundle.hospital;
  }
}
