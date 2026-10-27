import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
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
  @MaxLength(80)
  nombres!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  apellidos!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  parentesco!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  telefono!: string;
}

export class ResponsableAltaDto {
  @IsOptional()
  @IsUUID()
  responsable_id?: string;

  @ValidateIf((o: ResponsableAltaDto) => o.responsable_id !== undefined && o.responsable_id !== null && o.responsable_id !== '')
  @IsInt()
  @Min(1)
  version_responsable?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  parentesco!: string;

  @IsBoolean()
  es_principal!: boolean;

  @IsBoolean()
  autoriza_atencion!: boolean;

  @ValidateIf((o: ResponsableAltaDto) => !o.responsable_id)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombres?: string;

  @ValidateIf((o: ResponsableAltaDto) => !o.responsable_id)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  apellidos?: string;

  @ValidateIf((o: ResponsableAltaDto) => !o.responsable_id)
  @IsString()
  @IsNotEmpty()
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
