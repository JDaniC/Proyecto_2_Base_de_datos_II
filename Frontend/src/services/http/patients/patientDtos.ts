import type { InstitucionIdCanonica, SexoAdministrativo, TipoEventoHistorial, CausaArchivo } from '../../types';

export interface IdentificacionDto { tipo: 'CUI' | 'PASAPORTE'; numero: string }
export interface ContactoDto { nombres: string; apellidos: string; parentesco: string; telefono: string }
export interface PacienteDto {
  id: string;
  codigo_legible: string;
  institucion: InstitucionIdCanonica;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  sexo: string | null;
  identificacion?: { tipo: string; numero: string };
  telefono?: string;
  correo?: string;
  direccion?: string;
  grupo_sanguineo?: string;
  contacto_emergencia?: ContactoDto;
  estado: 'ACTIVO' | 'ARCHIVADO';
  version: number;
  fecha_registro: string;
  responsables?: {
    responsable: { id: string; nombres: string; apellidos: string; nombre: string; telefono: string; documento?: IdentificacionDto; version: number };
    vinculo: { responsable_id: string; version_responsable: number; parentesco: string; es_principal: boolean; autoriza_atencion: boolean };
    version_vinculo: number;
  }[];
  baja?: { causa: CausaArchivo; motivo: string; fecha_hora: string; actor_id: string };
}
export interface AltaPacienteHttp {
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string;
  sexo: SexoAdministrativo;
  identificacion?: IdentificacionDto;
  telefono?: string;
  correo?: string;
  direccion?: string;
  grupo_sanguineo?: string;
  contacto_emergencia?: ContactoDto;
  responsables?: ({ responsable_id: string; version_responsable: number; parentesco: string; es_principal: boolean; autoriza_atencion: boolean } | { nombres: string; apellidos: string; documento: IdentificacionDto; telefono: string; parentesco: string; es_principal: boolean; autoriza_atencion: boolean })[];
}
export interface EventoDto {
  id: string;
  fecha_hora: string;
  tipo: TipoEventoHistorial;
  recurso_id: string;
  titulo: string;
  profesional?: { id: string; nombre: string; rol: string; activo: true };
  consulta_id?: string;
  version_consulta?: number;
}
export interface HistorialDto { paciente_id: string; version: number; estado: 'ACTIVO' | 'ARCHIVADO'; eventos: EventoDto[] }
export interface ExpedienteDto { paciente: PacienteDto; historial: HistorialDto }
