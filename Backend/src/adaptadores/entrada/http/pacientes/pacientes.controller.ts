import { CambiarEstadoHistorial } from '../../../../aplicacion/casos-uso/historiales/cambiar-estado-historial.js';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { RegistrarPaciente } from '../../../../aplicacion/casos-uso/pacientes/registrar-paciente.js';
import { ActualizarPaciente } from '../../../../aplicacion/casos-uso/pacientes/actualizar-paciente.js';
import { ConsultarPaciente } from '../../../../aplicacion/casos-uso/pacientes/consultar-paciente.js';
import { BuscarPacientes } from '../../../../aplicacion/casos-uso/pacientes/buscar-pacientes.js';
import {
  Bundle,
  Contexto,
  RequiereAcceso,
} from '../decoradores-auth.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../../../aplicacion/puertos/bundle-institucional.js';
import { AltaPacienteDto } from './alta-paciente.dto.js';
import { CambioPacienteDto } from './cambio-paciente.dto.js';
import { BuscarPacientesDto } from './buscar-pacientes.dto.js';
import type {
  PacienteDto,
  RespuestaPacientesDto,
} from '../../../../aplicacion/casos-uso/pacientes/dtos-pacientes.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { solicitudInvalida } from '../../../../dominio/compartido/error-dominio.js';

@Controller('pacientes')
export class PacientesController {
  constructor(
    private readonly estadoHistorial: CambiarEstadoHistorial,
    private readonly registrarPaciente: RegistrarPaciente,
    private readonly actualizarPaciente: ActualizarPaciente,
    private readonly consultarPaciente: ConsultarPaciente,
    private readonly buscarPacientes: BuscarPacientes,
  ) {}

  @Post(':id/archivo')
  @HttpCode(200)
  @RequiereAcceso({permisos: ['historial.archivar'], capacidad: 'PACIENTES'})
  async archivar(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') clave: string, @Body() entrada: unknown, @Param('id') id: string,
    @Res({passthrough: true}) res: Response) {
    const r = await this.estadoHistorial.ejecutar('archivar', {contexto, bundle, entrada, id: uuidPublico(id), claveIdempotencia: uuidPublico(clave)});
    res.status(r.httpStatus);
    return {data: r.respuesta, meta: {correlacion: r.correlacionOriginal}};
  }
  @Post(':id/reactivacion')
  @HttpCode(200)
  @RequiereAcceso({permisos: ['historial.archivar'], capacidad: 'PACIENTES'})
  async reactivar(@Contexto() contexto: ContextoAutenticado, @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') clave: string, @Body() entrada: unknown, @Param('id') id: string,
    @Res({passthrough: true}) res: Response) {
    const r = await this.estadoHistorial.ejecutar('reactivar', {contexto, bundle, entrada, id: uuidPublico(id), claveIdempotencia: uuidPublico(clave)});
    res.status(r.httpStatus);
    return {data: r.respuesta, meta: {correlacion: r.correlacionOriginal}};
  }
  @Post()
  @HttpCode(201)
  @RequiereAcceso({
    permisos: ['pacientes.administrar'],
    capacidad: 'PACIENTES',
  })
  async registrar(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: AltaPacienteDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: PacienteDto; meta: { correlacion: string } }> {
    if (!idempotencyKey) {
      throw solicitudInvalida('La cabecera Idempotency-Key es requerida.', 'Idempotency-Key');
    }
    const clave = uuidPublico(idempotencyKey, 'Idempotency-Key');
    const resultado = await this.registrarPaciente.ejecutar({
      contexto,
      bundle,
      claveIdempotencia: clave,
      entrada: body,
    });
    res.setHeader('X-Correlation-ID', resultado.correlacionOriginal);
    return {
      data: resultado.respuesta,
      meta: { correlacion: resultado.correlacionOriginal },
    };
  }

  @Get()
  @RequiereAcceso({
    permisos: ['pacientes.administrar', 'historial.leer'],
    modo: 'ALGUNO',
    capacidad: 'PACIENTES',
  })
  async buscar(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Query() query: BuscarPacientesDto,
  ): Promise<RespuestaPacientesDto> {
    return this.buscarPacientes.ejecutar({
      contexto,
      bundle,
      entrada: query,
    });
  }

  @Get(':id')
  @RequiereAcceso({
    permisos: ['pacientes.administrar', 'historial.leer'],
    modo: 'ALGUNO',
    capacidad: 'PACIENTES',
  })
  async consultar(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('id') id: string,
  ): Promise<PacienteDto> {
    const pacienteId = uuidPublico(id, 'id');
    return this.consultarPaciente.ejecutar({
      contexto,
      bundle,
      id: pacienteId,
    });
  }

  @Patch(':id')
  @RequiereAcceso({
    permisos: ['pacientes.administrar'],
    capacidad: 'PACIENTES',
  })
  async actualizar(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: CambioPacienteDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ data: PacienteDto; meta: { correlacion: string } }> {
    if (!idempotencyKey) {
      throw solicitudInvalida('La cabecera Idempotency-Key es requerida.', 'Idempotency-Key');
    }
    const clave = uuidPublico(idempotencyKey, 'Idempotency-Key');
    const pacienteId = uuidPublico(id, 'id');

    const clavesModificables = Object.keys(body).filter(
      (k) => k !== 'version_esperada' && (body as unknown as Record<string, unknown>)[k] !== undefined,
    );
    if (clavesModificables.length === 0) {
      throw solicitudInvalida('El cambio de paciente requiere al menos un campo para actualizar además de version_esperada.');
    }

    const resultado = await this.actualizarPaciente.ejecutar({
      contexto,
      bundle,
      id: pacienteId,
      claveIdempotencia: clave,
      cambios: body,
    });
    res.setHeader('X-Correlation-ID', resultado.correlacionOriginal);
    return {
      data: resultado.respuesta,
      meta: { correlacion: resultado.correlacionOriginal },
    };
  }
}
