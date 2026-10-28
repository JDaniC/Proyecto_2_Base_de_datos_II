import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ConsultarHistorial } from '../../../../aplicacion/casos-uso/historiales/consultar-historial.js';
import { TIPOS_EVENTO, type TipoEventoHistorial } from '../../../../aplicacion/puertos/historial.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../../../aplicacion/puertos/bundle-institucional.js';
import { Contexto, Bundle, RequiereAcceso } from '../decoradores-auth.js';
export class BuscarHistorialDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite?: number;
  @IsOptional() @IsIn(['ASC', 'DESC']) orden?: 'ASC' | 'DESC';
  @IsOptional() @IsString() @MaxLength(2048) cursor?: string;
  @IsOptional() @IsString() desde?: string;
  @IsOptional() @IsString() hasta?: string;
  @IsOptional() @IsIn(TIPOS_EVENTO) tipo?: TipoEventoHistorial;
}
function limitarRespuesta<T>(respuesta: T): T {
  if (Buffer.byteLength(JSON.stringify(respuesta), 'utf8') > 262144) throw new ErrorDominio('LIMITE_AGREGADO', 'La respuesta excede el tamaño permitido; use una página menor.');
  return respuesta;
}
@Controller('pacientes')
export class HistorialesController {
  constructor(private readonly consultar: ConsultarHistorial) {}
  @Get(':id/historial')
  @RequiereAcceso({ permisos: ['historial.leer'], capacidad: 'HISTORIAL_CLINICO' })
  async historial(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional, @Param('id') id: string, @Query() query: BuscarHistorialDto) {
    return limitarRespuesta(await this.consultar.ejecutar(contexto, bundle, id, query));
  }
  @Get(':id/expediente')
  @RequiereAcceso({ permisos: ['historial.leer'], capacidad: 'HISTORIAL_CLINICO' })
  async expediente(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional, @Param('id') id: string, @Query() query: BuscarHistorialDto) {
    return limitarRespuesta(await this.consultar.ejecutar(contexto, bundle, id, query, true));
  }
}
