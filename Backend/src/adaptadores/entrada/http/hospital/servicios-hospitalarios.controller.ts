import { Controller,Get,Post,Param,Query,Body,Headers } from '@nestjs/common';
import { Bundle,Contexto,RequiereAcceso } from '../decoradores-auth.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../../../aplicacion/puertos/bundle-institucional.js';
import type { TipoServicioHospital } from '../../../../aplicacion/puertos/servicios-hospitalarios.js';
import { ServiciosHospitalarios } from '../../../../aplicacion/casos-uso/hospital/servicios-hospitalarios.js';

const LECTURA={permisos:['historial.leer'] as const,instituciones:['HOSPITAL_GENERAL'] as const};
const CLINICA={permisos:['historial.leer','consultas.registrar'] as const,instituciones:['HOSPITAL_GENERAL'] as const};
const ADMIN={permisos:['pacientes.administrar'] as const,instituciones:['HOSPITAL_GENERAL'] as const};
const COBERTURA={permisos:['pacientes.administrar','historial.leer'] as const,modo:'ALGUNO' as const,instituciones:['HOSPITAL_GENERAL'] as const};
@Controller('hospital')
export class ServiciosHospitalariosController {
  constructor(private readonly servicios:ServiciosHospitalarios){}
  private async pagina(c:ContextoAutenticado,b:BundleInstitucional,tipo:TipoServicioHospital,q:{pacienteId?:string;ordenId?:string;estado?:string;pagina?:string;limite?:string}){
    const numero=Number(q.pagina??1),limite=Number(q.limite??25);
    const r=await this.servicios.listar(c,b,tipo,{...(q.pacienteId?{pacienteId:q.pacienteId}:{}),...(q.ordenId?{ordenId:q.ordenId}:{}),...(q.estado?{estado:q.estado}:{}),pagina:numero,limite});
    return {items:r.slice(0,limite).map(x=>x.contenido),pagina:numero,hayMas:r.length>limite};
  }
  @Get('servicios/catalogos') @RequiereAcceso(COBERTURA)
  catalogos(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional){return this.servicios.catalogos(c,b);}
  @Get('examenes/ordenes') @RequiereAcceso(LECTURA)
  ordenes(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Query() q:{pacienteId?:string;estado?:string;pagina?:string;limite?:string}){return this.pagina(c,b,'orden',q);}
  @Get('examenes/ordenes/:id') @RequiereAcceso(LECTURA)
  async orden(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('id') id:string,@Query('pacienteId') paciente?:string){return (await this.servicios.porId(c,b,'orden',id,paciente)).contenido;}
  @Get('examenes/ordenes/:id/resultados') @RequiereAcceso(LECTURA)
  resultados(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('id') id:string,@Query() q:{pacienteId?:string;pagina?:string;limite?:string}){return this.pagina(c,b,'resultado',{...q,ordenId:id});}
  @Get('examenes/resultados/:id') @RequiereAcceso(LECTURA)
  async resultado(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('id') id:string,@Query('pacienteId') paciente?:string){return (await this.servicios.porId(c,b,'resultado',id,paciente)).contenido;}
  @Post('pacientes/:pacienteId/examenes/ordenes') @RequiereAcceso(CLINICA)
  async crearOrden(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('pacienteId') pid:string,@Body() e:unknown,@Headers('idempotency-key') clave?:string){return (await this.servicios.ejecutar(c,b,'ordenCrear',pid,undefined,e,clave)).contenido;}
  @Post('pacientes/:pacienteId/examenes/ordenes/:id/cancelacion') @RequiereAcceso(CLINICA)
  async cancelar(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('pacienteId') pid:string,@Param('id') id:string,@Body() e:unknown,@Headers('idempotency-key') clave?:string){return (await this.servicios.ejecutar(c,b,'ordenCancelar',pid,id,e,clave)).contenido;}
  @Post('pacientes/:pacienteId/examenes/ordenes/:id/resultados') @RequiereAcceso(CLINICA)
  async emitir(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('pacienteId') pid:string,@Param('id') id:string,@Body() e:unknown,@Headers('idempotency-key') clave?:string){return (await this.servicios.ejecutar(c,b,'resultadoRegistrar',pid,id,e,clave)).contenido;}
  @Get('pacientes/:pacienteId/resultados') @RequiereAcceso(LECTURA)
  resultadosPaciente(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('pacienteId') pid:string,@Query() q:{pagina?:string;limite?:string}){return this.pagina(c,b,'resultado',{...q,pacienteId:pid});}
  @Get('pacientes/:pacienteId/polizas') @RequiereAcceso(COBERTURA)
  polizas(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('pacienteId') pid:string,@Query() q:{estado?:string;pagina?:string;limite?:string}){return this.pagina(c,b,'poliza',{...q,pacienteId:pid});}
  @Post('pacientes/:pacienteId/polizas') @RequiereAcceso(ADMIN)
  async afiliar(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('pacienteId') pid:string,@Body() e:unknown,@Headers('idempotency-key') clave?:string){return (await this.servicios.ejecutar(c,b,'polizaAfiliar',pid,undefined,e,clave)).contenido;}
  @Post('pacientes/:pacienteId/polizas/:id/estado') @RequiereAcceso(ADMIN)
  async estadoPoliza(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('pacienteId') pid:string,@Param('id') id:string,@Body() e:unknown,@Headers('idempotency-key') clave?:string){return (await this.servicios.ejecutar(c,b,'polizaEstado',pid,id,e,clave)).contenido;}
  @Get('pacientes/:pacienteId/procedimientos') @RequiereAcceso(LECTURA)
  procedimientos(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('pacienteId') pid:string,@Query() q:{pagina?:string;limite?:string}){return this.pagina(c,b,'procedimiento',{...q,pacienteId:pid});}
  @Post('pacientes/:pacienteId/procedimientos') @RequiereAcceso(CLINICA)
  async registrarProcedimiento(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('pacienteId') pid:string,@Body() e:unknown,@Headers('idempotency-key') clave?:string){return (await this.servicios.ejecutar(c,b,'procedimientoRegistrar',pid,undefined,e,clave)).contenido;}
}
