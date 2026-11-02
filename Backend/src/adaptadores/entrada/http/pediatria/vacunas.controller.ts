import { GestionarCatalogoVacunas } from '../../../../aplicacion/casos-uso/pediatria/gestionar-catalogo-vacunas.js';
import { AsignarEsquemaVacuna } from '../../../../aplicacion/casos-uso/pediatria/asignar-esquema.js';
import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Bundle, Contexto, RequiereAcceso } from '../decoradores-auth.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../../../aplicacion/puertos/bundle-institucional.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { objetoCerrado } from '../../../../dominio/clinica/consulta.js';
import { ErrorDominio } from '../../../../dominio/compartido/error-dominio.js';
import { ConsultarEsquemaVacunas } from '../../../../aplicacion/casos-uso/pediatria/consultar-esquema-vacunas.js';
import { ConsultarAplicacionesVacuna } from '../../../../aplicacion/casos-uso/pediatria/consultar-aplicaciones.js';
import { RegistrarAplicacionVacuna } from '../../../../aplicacion/casos-uso/pediatria/registrar-aplicacion.js';
import { CorregirAplicacionVacuna } from '../../../../aplicacion/casos-uso/pediatria/corregir-aplicacion.js';
import { AnularAplicacionVacuna } from '../../../../aplicacion/casos-uso/pediatria/anular-aplicacion.js';

@Controller()
export class VacunasController {
  constructor(
    private readonly gestionarCatalogo: GestionarCatalogoVacunas,
    private readonly asignarEsquema: AsignarEsquemaVacuna,
    private readonly consultarEsquema: ConsultarEsquemaVacunas,
    private readonly consultarAplicaciones: ConsultarAplicacionesVacuna,
    private readonly registrarApp: RegistrarAplicacionVacuna,
    private readonly corregirApp: CorregirAplicacionVacuna,
    private readonly anularApp: AnularAplicacionVacuna
  ) {}

  @Post('vacunas')
  @HttpCode(201)
  @RequiereAcceso({permisos:['usuarios.administrar'],capacidad:'PEDIATRIA'})
  async crearVacuna(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Headers('idempotency-key') clave:string,@Body() entrada:unknown) {
    return (await this.gestionarCatalogo.ejecutar({contexto,bundle,claveIdempotencia:uuidPublico(clave),entrada})).respuesta;
  }
  @Post('vacunas/:vacunaId/versiones')
  @HttpCode(201)
  @RequiereAcceso({permisos:['usuarios.administrar'],capacidad:'PEDIATRIA'})
  async versionarVacuna(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('vacunaId') id:string,@Headers('idempotency-key') clave:string,@Body() entrada:unknown) {
    return (await this.gestionarCatalogo.ejecutar({contexto,bundle,id:uuidPublico(id),claveIdempotencia:uuidPublico(clave),entrada})).respuesta;
  }
  @Post('pacientes/:pacienteId/esquemas')
  @HttpCode(201)
  @RequiereAcceso({permisos:['consultas.registrar'],capacidad:'PACIENTES'})
  async asignar(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('pacienteId') id:string,@Headers('idempotency-key') clave:string,@Body() entrada:unknown) {
    const r=await this.asignarEsquema.ejecutar({contexto,bundle,id:uuidPublico(id),claveIdempotencia:uuidPublico(clave),entrada});
    return r.respuesta;
  }
  @Get('pacientes/:pacienteId/esquemas')
  @RequiereAcceso({ permisos: ['historial.leer'], capacidad: 'PACIENTES' })
  async leerEsquema(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('pacienteId') id: string,
    @Query() query: unknown
  ) {
    objetoCerrado(query, []);
    return this.consultarEsquema.ejecutar(contexto, bundle, id);
  }

  @Get('pacientes/:pacienteId/aplicaciones-vacuna')
  @RequiereAcceso({ permisos: ['historial.leer'], capacidad: 'PACIENTES' })
  async leerAplicaciones(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('pacienteId') id: string,
    @Query() query: unknown
  ) {
    objetoCerrado(query, []);
    return this.consultarAplicaciones.ejecutar(contexto, bundle, id);
  }

  @Get('vacunas')
  @RequiereAcceso({ permisos: ['historial.leer'], capacidad: 'PACIENTES' })
  async catalogoVacunas(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Query() query: unknown
  ) {
    objetoCerrado(query, []);
    if(contexto.cuenta.institucion!=='CENTRO_MEDICO_PEDIATRICO'||bundle.institucion!=='CENTRO_MEDICO_PEDIATRICO') throw new ErrorDominio('SIN_PERMISO','Operación exclusiva de pediatría.');
    if (!bundle.vacunasPediatricas) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Servicio de vacunas no disponible.');
    }
    return bundle.vacunasPediatricas.obtenerCatalogo();
  }

  @Get('vacunas/:vacunaId/versiones/:versionId')
  @RequiereAcceso({ permisos: ['historial.leer'], capacidad: 'PACIENTES' })
  async versionVacuna(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('vacunaId') vacunaId: string,
    @Param('versionId') versionId: string,
    @Query() query: unknown
  ) {
    objetoCerrado(query, []);
    if(contexto.cuenta.institucion!=='CENTRO_MEDICO_PEDIATRICO'||bundle.institucion!=='CENTRO_MEDICO_PEDIATRICO') throw new ErrorDominio('SIN_PERMISO','Operación exclusiva de pediatría.');
    if (!bundle.vacunasPediatricas) {
      throw new ErrorDominio('PERSISTENCIA_NO_DISPONIBLE', 'Servicio de vacunas no disponible.');
    }
    const ver = await bundle.vacunasPediatricas.obtenerVersionEsquema(
      uuidPublico(vacunaId),
      uuidPublico(versionId)
    );
    if (!ver) {
      throw new ErrorDominio('RECURSO_NO_ENCONTRADO', 'Versión de esquema no encontrada.');
    }
    return ver;
  }

  @Post('pacientes/:pacienteId/aplicaciones-vacuna')
  @HttpCode(201)
  @RequiereAcceso({ permisos: ['consultas.registrar'], capacidad: 'PACIENTES' })
  async registrar(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('pacienteId') id: string,
    @Headers('idempotency-key') clave: string,
    @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response
  ) {
    const r = await this.registrarApp.ejecutar({
      contexto,
      bundle,
      claveIdempotencia: uuidPublico(clave),
      entrada,
      id: uuidPublico(id),
    });
    res.set('idempotency-key', clave);
    res.status(r.httpStatus);
    return r.respuesta;
  }

  @Post('aplicaciones-vacuna/:aplicacionId/correcciones')
  @HttpCode(200)
  @RequiereAcceso({ permisos: ['consultas.registrar'], capacidad: 'PACIENTES' })
  async corregir(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('aplicacionId') aplicacionId: string,
    @Headers('idempotency-key') clave: string,
    @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response
  ) {
    const r = await this.corregirApp.ejecutar(aplicacionId, {
      contexto,
      bundle,
      claveIdempotencia: uuidPublico(clave),
      entrada,
      id: uuidPublico(aplicacionId.split('__')[0] || aplicacionId), // id context
    });
    res.set('idempotency-key', clave);
    res.status(r.httpStatus);
    return r.respuesta;
  }

  @Post('aplicaciones-vacuna/:aplicacionId/anulacion')
  @HttpCode(200)
  @RequiereAcceso({ permisos: ['consultas.registrar'], capacidad: 'PACIENTES' })
  async anular(
    @Contexto() contexto: ContextoAutenticado,
    @Bundle() bundle: BundleInstitucional,
    @Param('aplicacionId') aplicacionId: string,
    @Headers('idempotency-key') clave: string,
    @Body() entrada: unknown,
    @Res({ passthrough: true }) res: Response
  ) {
    const r = await this.anularApp.ejecutar(aplicacionId, {
      contexto,
      bundle,
      claveIdempotencia: uuidPublico(clave),
      entrada,
      id: uuidPublico(aplicacionId.split('__')[0] || aplicacionId),
    });
    res.set('idempotency-key', clave);
    res.status(r.httpStatus);
    return r.respuesta;
  }
}
