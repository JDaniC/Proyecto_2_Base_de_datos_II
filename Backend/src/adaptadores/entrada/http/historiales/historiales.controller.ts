import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { Body, Controller, Get, Headers, HttpCode, Param, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ConsultarHistorial } from '../../../../aplicacion/casos-uso/historiales/consultar-historial.js';
import {
  ActualizarAntecedentesClinicos,
  ConsultarAntecedentesClinicos,
} from '../../../../aplicacion/casos-uso/pacientes/antecedentes-clinicos.js';
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
  constructor(
    private readonly consultar: ConsultarHistorial,
    private readonly consultarAntecedentes: ConsultarAntecedentesClinicos,
    private readonly actualizarAntecedentes: ActualizarAntecedentesClinicos,
  ) {}
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
  @Get(':id/antecedentes')
  @RequiereAcceso({ permisos: ['historial.leer'], capacidad: 'HISTORIAL_CLINICO' })
  async obtenerAntecedentes(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('id') id: string,
  ) {
    return this.consultarAntecedentes.ejecutar(contexto, bundle, id);
  }
  @Put(':id/antecedentes')
  @HttpCode(200)
  @RequiereAcceso({ permisos: ['consultas.registrar'], capacidad: 'CONSULTAS' })
  async guardarAntecedentes(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') clave: string,
    @Param('id') id: string,
    @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const r = await this.actualizarAntecedentes.ejecutar({
      contexto,
      bundle,
      claveIdempotencia: uuidPublico(clave),
      id: uuidPublico(id),
      entrada,
    });
    res.status(r.httpStatus);
    return { data: r.respuesta, meta: { correlacion: r.correlacionOriginal } };
  }
}
