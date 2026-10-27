import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { Sexo, TipoIdentificacion } from '../../../../dominio/clinica/paciente.js';

export class IdentificacionDto {
  @IsIn(['CUI', 'PASAPORTE'])
  tipo!: TipoIdentificacion;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  numero!: string;
}

export class ContactoEmergenciaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  telefono!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  relacion?: string;
}

export class ResponsableAltaDto {
  @IsOptional()
  @IsString()
  responsable_id?: string;

  @IsOptional()
  version_responsable?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  parentesco!: string;

  @IsBoolean()
  es_principal!: boolean;

  @IsBoolean()
  autoriza_atencion!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombres?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  apellidos?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => IdentificacionDto)
  documento?: IdentificacionDto;
}

export class AltaPacienteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  apellidos!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_nacimiento!: string;

  @IsIn(['MASCULINO', 'FEMENINO', 'OTRO'])
  sexo!: Sexo;

  @IsOptional()
  @ValidateNested()
  @Type(() => IdentificacionDto)
  identificacion?: IdentificacionDto;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  correo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  direccion?: string;

  @IsOptional()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  grupo_sanguineo?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactoEmergenciaDto)
  contacto_emergencia?: ContactoEmergenciaDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResponsableAltaDto)
  responsables?: ResponsableAltaDto[];
}
