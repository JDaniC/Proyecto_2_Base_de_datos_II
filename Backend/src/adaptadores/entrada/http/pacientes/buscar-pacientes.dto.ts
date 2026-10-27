import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { EstadoPaciente } from '../../../../dominio/clinica/paciente.js';

export class BuscarPacientesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  q!: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  orden?: 'ASC' | 'DESC';

  @IsOptional()
  @IsIn(['ACTIVO', 'ARCHIVADO', 'TODOS'])
  estado?: EstadoPaciente | 'TODOS';
}
