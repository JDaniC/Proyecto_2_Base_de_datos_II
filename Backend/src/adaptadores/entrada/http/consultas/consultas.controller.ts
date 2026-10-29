import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Bundle, Contexto, RequiereAcceso } from '../decoradores-auth.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../../../aplicacion/puertos/bundle-institucional.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { AtencionClinica } from '../../../../aplicacion/casos-uso/consultas/atencion-clinica.js';
import { ConsultarConsulta } from '../../../../aplicacion/casos-uso/consultas/consultar-consulta.js';
import { objetoCerrado } from '../../../../dominio/clinica/consulta.js';
import { proyectarConsulta } from './proyectar-consulta.js';
@Controller('consultas')
export class ConsultasController {
  constructor(private readonly atencion: AtencionClinica, private readonly lectura: ConsultarConsulta) {}
  @Post('')
  @HttpCode(201)
  @RequiereAcceso({ permisos: ['consultas.registrar'], capacidad: 'CONSULTAS' })
  async abrir(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') clave: string, @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response) {
    const r = await this.atencion.ejecutar('abrir', { contexto, bundle, claveIdempotencia: uuidPublico(clave), entrada });
    res.status(r.httpStatus);
    return { data: proyectarConsulta(r.respuesta), meta: { correlacion: r.correlacionOriginal } };
  }
  @Post('completas')
  @HttpCode(201)
  @RequiereAcceso({ permisos: ['consultas.registrar'], capacidad: 'CONSULTAS' })
  async completa(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') clave: string, @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response) {
    const r = await this.atencion.ejecutar('completa', { contexto, bundle, claveIdempotencia: uuidPublico(clave), entrada });
    res.status(r.httpStatus);
    return { data: proyectarConsulta(r.respuesta), meta: { correlacion: r.correlacionOriginal } };
  }
  @Post(':id/diagnosticos')
  @HttpCode(200)
  @RequiereAcceso({ permisos: ['diagnosticos.registrar'], capacidad: 'CONSULTAS' })
  async diagnostico(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') clave: string, @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response, @Param('id') id: string) {
    const r = await this.atencion.ejecutar('diagnostico', { contexto, bundle, claveIdempotencia: uuidPublico(clave), entrada, id: uuidPublico(id) });
    res.status(r.httpStatus);
    return { data: proyectarConsulta(r.respuesta), meta: { correlacion: r.correlacionOriginal } };
  }
  @Post(':id/tratamientos')
  @HttpCode(200)
  @RequiereAcceso({ permisos: ['tratamientos.registrar'], capacidad: 'CONSULTAS' })
  async tratamiento(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') clave: string, @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response, @Param('id') id: string) {
    const r = await this.atencion.ejecutar('tratamiento', { contexto, bundle, claveIdempotencia: uuidPublico(clave), entrada, id: uuidPublico(id) });
    res.status(r.httpStatus);
    return { data: proyectarConsulta(r.respuesta), meta: { correlacion: r.correlacionOriginal } };
  }
  @Post(':id/receta')
  @HttpCode(200)
  @RequiereAcceso({ permisos: ['recetas.emitir'], capacidad: 'CONSULTAS' })
  async receta(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') clave: string, @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response, @Param('id') id: string) {
    const r = await this.atencion.ejecutar('receta', { contexto, bundle, claveIdempotencia: uuidPublico(clave), entrada, id: uuidPublico(id) });
    res.status(r.httpStatus);
    return { data: proyectarConsulta(r.respuesta), meta: { correlacion: r.correlacionOriginal } };
  }
  @Post(':id/finalizacion')
  @HttpCode(200)
  @RequiereAcceso({ permisos: ['consultas.registrar'], capacidad: 'CONSULTAS' })
  async finalizar(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') clave: string, @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response, @Param('id') id: string) {
    const r = await this.atencion.ejecutar('finalizar', { contexto, bundle, claveIdempotencia: uuidPublico(clave), entrada, id: uuidPublico(id) });
    res.status(r.httpStatus);
    return { data: proyectarConsulta(r.respuesta), meta: { correlacion: r.correlacionOriginal } };
  }
  @Get(':id')
  @RequiereAcceso({ permisos: ['historial.leer'], capacidad: 'CONSULTAS' })
  async obtener(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional,
    @Param('id') id: string, @Query() query: Record<string, unknown>) {
    const q = objetoCerrado(query, ['version']);
    const version = q.version === undefined ? undefined : typeof q.version === 'string' && /^[1-9][0-9]*$/.test(q.version) ? Number(q.version) : NaN;
    return proyectarConsulta(await this.lectura.ejecutar(contexto, bundle, id, version));
  }
}
