import {
  IsInt,
  Min,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
  IsIn,
  IsEmail,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { Sexo } from '../../../../dominio/clinica/paciente.js';
import { IdentificacionDto, ContactoEmergenciaDto } from './alta-paciente.dto.js';

export class CambioPacienteDto {
  @IsInt()
  @Min(1)
  version_esperada!: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombres?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  apellidos?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha_nacimiento?: string;

  @IsOptional()
  @IsIn(['MASCULINO', 'FEMENINO', 'OTRO'])
  sexo?: Sexo;

  @IsOptional()
  @ValidateIf((_obj, val) => val !== null)
  @ValidateNested()
  @Type(() => IdentificacionDto)
  identificacion?: IdentificacionDto | null;

  @IsOptional()
  @ValidateIf((_obj, val) => val !== null)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'telefono no puede contener solo espacios' })
  @MaxLength(30)
  telefono?: string | null;

  @IsOptional()
  @ValidateIf((_obj, val) => val !== null)
  @IsEmail()
  @MaxLength(254)
  correo?: string | null;

  @IsOptional()
  @ValidateIf((_obj, val) => val !== null)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'direccion no puede contener solo espacios' })
  @MaxLength(500)
  direccion?: string | null;

  @IsOptional()
  @ValidateIf((_obj, val) => val !== null)
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  grupo_sanguineo?: string | null;

  @IsOptional()
  @ValidateIf((_obj, val) => val !== null)
  @ValidateNested()
  @Type(() => ContactoEmergenciaDto)
  contacto_emergencia?: ContactoEmergenciaDto | null;
}
