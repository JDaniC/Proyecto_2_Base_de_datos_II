import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Headers,
} from '@nestjs/common';
import { Bundle, Contexto, RequiereAcceso } from '../decoradores-auth.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../../../aplicacion/puertos/bundle-institucional.js';
import { ConsultarHospitalizaciones } from '../../../../aplicacion/casos-uso/hospital/consultar-hospitalizaciones.js';
import {
  GestionarHospitalizaciones,
  type EntradaIngresoHospitalario,
  type EntradaEgresoHospitalario,
  type EntradaAsignarCama,
  type EntradaLiberarCama,
  type EntradaNotaEvolucion,
  type EntradaProcedimientoHospitalario,
} from '../../../../aplicacion/casos-uso/hospital/gestionar-hospitalizaciones.js';

@Controller('hospital')
export class HospitalController {
  constructor(
    private readonly consultarHospitalizaciones: ConsultarHospitalizaciones,
    private readonly gestionarHospitalizaciones: GestionarHospitalizaciones,
  ) {}

  @Get('hospitalizaciones')
  @RequiereAcceso({ permisos: ['historial.leer'], instituciones: ['HOSPITAL_GENERAL'] })
  async listarHospitalizaciones(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Query('estado') estado?: string,
    @Query('pacienteId') pacienteId?: string,
    @Query('pagina') numeroPagina = '1',
    @Query('limite') numeroLimite = '25',
  ) {
    const pagina = { pagina: Number(numeroPagina), limite: Number(numeroLimite) };
    const items = pacienteId
      ? await this.consultarHospitalizaciones.ejecutarPorPaciente(contexto, bundle, pacienteId, pagina, estado)
      : await this.consultarHospitalizaciones.ejecutarListado(contexto, bundle, estado, pagina);
    return { hospitalizaciones: items.slice(0, pagina.limite), pagina: pagina.pagina, hayMas: items.length > pagina.limite };

  }

  @Get('hospitalizaciones/:id')
  @RequiereAcceso({ permisos: ['historial.leer'], instituciones: ['HOSPITAL_GENERAL'] })
  async obtenerHospitalizacionPorId(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('id') id: string,
  ) {
    const item = await this.consultarHospitalizaciones.ejecutarPorId(contexto, bundle, id);
    return item;
  }

  @Get('camas')
  @RequiereAcceso({ permisos: ['historial.leer'], instituciones: ['HOSPITAL_GENERAL'] })
  async listarCamas(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
  ) {
    const items = await this.consultarHospitalizaciones.ejecutarListarCamas(contexto, bundle);
    return { camas: items };
  }

  @Post('hospitalizaciones')
  @RequiereAcceso({ permisos: ['historial.leer', 'consultas.registrar'], instituciones: ['HOSPITAL_GENERAL'] })
  async crearIngreso(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Body() body: EntradaIngresoHospitalario,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const item = await this.gestionarHospitalizaciones.ingresar(contexto, bundle, body, idempotencyKey);
    return item;
  }

  @Post('hospitalizaciones/:id/egreso')
  @RequiereAcceso({ permisos: ['historial.leer', 'consultas.registrar'], instituciones: ['HOSPITAL_GENERAL'] })
  async registrarEgreso(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('id') id: string,
    @Body() body: EntradaEgresoHospitalario,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const item = await this.gestionarHospitalizaciones.egresar(contexto, bundle, id, body, idempotencyKey);
    return item;
  }

  @Post('hospitalizaciones/:id/asignacion-cama')
  @RequiereAcceso({ permisos: ['historial.leer', 'consultas.registrar'], instituciones: ['HOSPITAL_GENERAL'] })
  async asignarCama(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('id') id: string,
    @Body() body: EntradaAsignarCama,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const item = await this.gestionarHospitalizaciones.asignarCama(contexto, bundle, id, body, idempotencyKey);
    return item;
  }

  @Post('hospitalizaciones/:id/liberacion-cama')
  @RequiereAcceso({ permisos: ['historial.leer', 'consultas.registrar'], instituciones: ['HOSPITAL_GENERAL'] })
  async liberarCama(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('id') id: string,
    @Body() body: EntradaLiberarCama,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const item = await this.gestionarHospitalizaciones.liberarCama(contexto, bundle, id, body, idempotencyKey);
    return item;
  }

  @Post('hospitalizaciones/:id/notas-evolucion')
  @RequiereAcceso({ permisos: ['historial.leer', 'consultas.registrar'], instituciones: ['HOSPITAL_GENERAL'] })
  async agregarNotaEvolucion(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('id') id: string,
    @Body() body: EntradaNotaEvolucion,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const item = await this.gestionarHospitalizaciones.agregarNotaEvolucion(contexto, bundle, id, body, idempotencyKey);
    return item;
  }

  @Post('hospitalizaciones/:id/procedimientos')
  @RequiereAcceso({ permisos: ['historial.leer', 'consultas.registrar'], instituciones: ['HOSPITAL_GENERAL'] })
  async agregarProcedimiento(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('id') id: string,
    @Body() body: EntradaProcedimientoHospitalario,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const item = await this.gestionarHospitalizaciones.agregarProcedimiento(contexto, bundle, id, body, idempotencyKey);
    return item;
  }
}
