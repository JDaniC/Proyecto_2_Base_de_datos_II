import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Bundle, Contexto, RequiereAcceso } from '../decoradores-auth.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../../../aplicacion/puertos/bundle-institucional.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { GestionarCitas } from '../../../../aplicacion/casos-uso/citas/gestionar-citas.js';
import { ConsultarCitas } from '../../../../aplicacion/casos-uso/citas/consultar-citas.js';
@Controller('citas')
export class CitasController {
  constructor(private readonly citas: GestionarCitas, private readonly lectura: ConsultarCitas) {}
  @Get()
  @RequiereAcceso({ permisos: ['citas.administrar', 'consultas.registrar'], modo: 'ALGUNO', capacidad: 'AGENDA' })
  async listar(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional, @Query() query: unknown) {
    const pagina = await this.lectura.listar(contexto, bundle, query);
    return { data: pagina.elementos, meta: { correlacion: contexto.correlacion,
      ...(pagina.siguienteCursor ? { siguiente_cursor: pagina.siguienteCursor } : {}) } };
  }
  @Get(':id')
  @RequiereAcceso({ permisos: ['citas.administrar', 'consultas.registrar'], modo: 'ALGUNO', capacidad: 'AGENDA' })
  obtener(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional, @Param('id') id: string) {
    return this.lectura.porId(contexto, bundle, id);
  }
  @Post('')
  @HttpCode(201)
  @RequiereAcceso({ permisos: ['citas.administrar'], capacidad: 'AGENDA' })
  async crear(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') clave: string, @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response) {
    const r = await this.citas.ejecutar('crear', { contexto, bundle, claveIdempotencia: uuidPublico(clave), entrada });
    res.status(r.httpStatus);
    return { data: r.respuesta, meta: { correlacion: r.correlacionOriginal } };
  }
  @Patch(':id/reprogramacion')
  @HttpCode(200)
  @RequiereAcceso({ permisos: ['citas.administrar'], capacidad: 'AGENDA' })
  async reprogramar(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') clave: string, @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response, @Param('id') id: string) {
    const r = await this.citas.ejecutar('reprogramar', { contexto, bundle, claveIdempotencia: uuidPublico(clave), entrada, id: uuidPublico(id) });
    res.status(r.httpStatus);
    return { data: r.respuesta, meta: { correlacion: r.correlacionOriginal } };
  }
  @Post(':id/cancelacion')
  @HttpCode(200)
  @RequiereAcceso({ permisos: ['citas.administrar'], capacidad: 'AGENDA' })
  async cancelar(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') clave: string, @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response, @Param('id') id: string) {
    const r = await this.citas.ejecutar('cancelar', { contexto, bundle, claveIdempotencia: uuidPublico(clave), entrada, id: uuidPublico(id) });
    res.status(r.httpStatus);
    return { data: r.respuesta, meta: { correlacion: r.correlacionOriginal } };
  }
}
