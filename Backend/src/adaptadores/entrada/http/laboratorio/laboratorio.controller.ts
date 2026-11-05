import {Body,Controller,Get,Headers,HttpCode,Param,Patch,Post,Query,Res} from '@nestjs/common';
import type {Response} from 'express';
import {CrearOrdenLaboratorio} from '../../../../aplicacion/casos-uso/laboratorio/crear-orden.js';
import {GestionarMuestraLaboratorio,type AccionMuestra} from '../../../../aplicacion/casos-uso/laboratorio/gestionar-muestra.js';
import {ConsultarListadosLaboratorio} from '../../../../aplicacion/casos-uso/laboratorio/consultar-listados.js';
import {ConsultarRecursosLaboratorio} from '../../../../aplicacion/casos-uso/laboratorio/consultar-recursos.js';
import {PublicarPruebaLaboratorio} from '../../../../aplicacion/casos-uso/laboratorio/publicar-prueba.js';
import {PublicarMetodoLaboratorio} from '../../../../aplicacion/casos-uso/laboratorio/publicar-metodo.js';
import {CambiarEstadoPruebaLaboratorio} from '../../../../aplicacion/casos-uso/laboratorio/cambiar-estado-prueba.js';
import {CambiarEstadoMetodoLaboratorio} from '../../../../aplicacion/casos-uso/laboratorio/cambiar-estado-metodo.js';
import {GuardarReferenciaLaboratorio} from '../../../../aplicacion/casos-uso/laboratorio/guardar-referencia.js';
import type {TipoCatalogoLaboratorio} from '../../../../aplicacion/puertos/laboratorio.js';
import type {TipoReferenciaAdministrativa} from '../../../../dominio/laboratorio/referencias.js';
import type {ContextoAutenticado} from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type {BundleInstitucional} from '../../../../aplicacion/puertos/bundle-institucional.js';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import {solicitudInvalida} from '../../../../dominio/compartido/error-dominio.js';
import {Bundle,Contexto,RequiereAcceso} from '../decoradores-auth.js';

type Escritura={httpStatus:number;respuesta:unknown};
type QueryCruda=Record<string,unknown>;

function consultaEscalar(query:unknown):QueryCruda{
 if(query===null||typeof query!=='object'||Array.isArray(query))throw solicitudInvalida('Consulta inválida.');
 const salida:QueryCruda={};
 for(const [campo,valor] of Object.entries(query)){
  if(typeof valor!=='string')throw solicitudInvalida('Cada parámetro de consulta debe ser escalar.',campo);
  if(campo==='limite'){
   if(!/^[1-9]\d{0,2}$/.test(valor))throw solicitudInvalida('Límite inválido.',campo);
   salida[campo]=Number(valor);
  }else if(campo==='activo'){
   if(valor!=='true'&&valor!=='false')throw solicitudInvalida('Estado inválido.',campo);
   salida[campo]=valor==='true';
  }else salida[campo]=valor;
 }
 return salida;
}

@Controller('laboratorio')
export class LaboratorioController{
 constructor(
  private readonly crearOrden:CrearOrdenLaboratorio,
  private readonly gestionarMuestra:GestionarMuestraLaboratorio,
  private readonly listados:ConsultarListadosLaboratorio,
  private readonly recursos:ConsultarRecursosLaboratorio,
  private readonly publicarPrueba:PublicarPruebaLaboratorio,
  private readonly publicarMetodo:PublicarMetodoLaboratorio,
  private readonly estadoPrueba:CambiarEstadoPruebaLaboratorio,
  private readonly estadoMetodo:CambiarEstadoMetodoLaboratorio,
  private readonly guardarReferencia:GuardarReferenciaLaboratorio,
 ){}

 @Post('ordenes') @HttpCode(201)
 @RequiereAcceso({permisos:['ordenes.administrar'],capacidad:'LABORATORIO'})
 crear(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Headers('idempotency-key') clave:string,@Body() entrada:unknown,@Res({passthrough:true}) res:Response){return this.escribir(this.crearOrden.ejecutar({contexto,bundle,claveIdempotencia:uuidPublico(clave),entrada}),clave,res);}

 @Get('ordenes') @RequiereAcceso({permisos:['ordenes.administrar'],capacidad:'LABORATORIO'})
 listarOrdenes(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Query() query:unknown){return this.listados.ejecutar('ordenes',{contexto,bundle,entrada:consultaEscalar(query)});}
 @Get('ordenes/:id') @RequiereAcceso({permisos:['ordenes.administrar'],capacidad:'LABORATORIO'})
 orden(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('id') id:string,@Query() query:unknown){consultaEscalarVacia(query);return this.recursos.detalle('ordenes',{contexto,bundle,id});}

 @Post('muestras') @HttpCode(201) @RequiereAcceso({permisos:['muestras.administrar'],capacidad:'LABORATORIO'})
 tomar(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Headers('idempotency-key') clave:string,@Body() entrada:unknown,@Res({passthrough:true}) res:Response){return this.muestra('tomar',contexto,bundle,undefined,clave,entrada,res);}
 @Post('muestras/:id/eventos') @RequiereAcceso({permisos:['muestras.administrar'],capacidad:'LABORATORIO'})
 evento(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('id') id:string,@Headers('idempotency-key') k:string,@Body() e:unknown,@Res({passthrough:true}) r:Response){return this.muestra('evento',c,b,id,k,e,r);}
 @Post('muestras/:id/rectificaciones') @RequiereAcceso({permisos:['muestras.administrar'],capacidad:'LABORATORIO'})
 rectificar(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('id') id:string,@Headers('idempotency-key') k:string,@Body() e:unknown,@Res({passthrough:true}) r:Response){return this.muestra('rectificar',c,b,id,k,e,r);}
 @Post('muestras/:id/retomas') @HttpCode(201) @RequiereAcceso({permisos:['muestras.administrar'],capacidad:'LABORATORIO'})
 retomar(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('id') id:string,@Headers('idempotency-key') k:string,@Body() e:unknown,@Res({passthrough:true}) r:Response){return this.muestra('retomar',c,b,id,k,e,r);}
 @Get('muestras') @RequiereAcceso({permisos:['muestras.administrar'],capacidad:'LABORATORIO'})
 listarMuestras(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Query() query:unknown){return this.listados.ejecutar('muestras',{contexto,bundle,entrada:consultaEscalar(query)});}
 @Get('muestras/:id') @RequiereAcceso({permisos:['muestras.administrar'],capacidad:'LABORATORIO'})
 muestraDetalle(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('id') id:string,@Query() query:unknown){consultaEscalarVacia(query);return this.recursos.detalle('muestras',{contexto,bundle,id});}

 @Get('catalogos/:tipo')
 @RequiereAcceso({permisos:['ordenes.administrar','muestras.administrar','resultados.analizar','resultados.validar'],modo:'ALGUNO',capacidad:'LABORATORIO'})
 catalogo(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('tipo') tipo:string,@Query() query:unknown){return this.recursos.catalogo(tipoCatalogo(tipo),{contexto,bundle,entrada:consultaEscalar(query)});}

 @Post('pruebas') @HttpCode(201) @RequiereAcceso({permisos:['resultados.validar'],capacidad:'LABORATORIO'})
 prueba(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Headers('idempotency-key') k:string,@Body() e:unknown,@Res({passthrough:true}) r:Response){return this.escribir(this.publicarPrueba.ejecutar({contexto:c,bundle:b,claveIdempotencia:uuidPublico(k),entrada:e}),k,r);}
 @Patch('pruebas/:id/estado') @RequiereAcceso({permisos:['resultados.validar'],capacidad:'LABORATORIO'})
 cambiarPrueba(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('id') id:string,@Headers('idempotency-key') k:string,@Body() e:unknown,@Res({passthrough:true}) r:Response){return this.escribir(this.estadoPrueba.ejecutar({contexto:c,bundle:b,id:uuidPublico(id),claveIdempotencia:uuidPublico(k),entrada:e}),k,r);}
 @Post('metodos') @HttpCode(201) @RequiereAcceso({permisos:['resultados.validar'],capacidad:'LABORATORIO'})
 metodo(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Headers('idempotency-key') k:string,@Body() e:unknown,@Res({passthrough:true}) r:Response){return this.escribir(this.publicarMetodo.ejecutar({contexto:c,bundle:b,claveIdempotencia:uuidPublico(k),entrada:e}),k,r);}
 @Patch('metodos/:id/estado') @RequiereAcceso({permisos:['resultados.validar'],capacidad:'LABORATORIO'})
 cambiarMetodo(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('id') id:string,@Headers('idempotency-key') k:string,@Body() e:unknown,@Res({passthrough:true}) r:Response){return this.escribir(this.estadoMetodo.ejecutar({contexto:c,bundle:b,id:uuidPublico(id),claveIdempotencia:uuidPublico(k),entrada:e}),k,r);}

 @Post('referencias/:tipo') @HttpCode(201) @RequiereAcceso({permisos:['ordenes.administrar'],capacidad:'LABORATORIO'})
 crearReferencia(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('tipo') tipo:string,@Headers('idempotency-key') k:string,@Body() e:unknown,@Res({passthrough:true}) r:Response){return this.referencia(tipo,c,b,undefined,k,e,r);}
 @Patch('referencias/:tipo/:id') @RequiereAcceso({permisos:['ordenes.administrar'],capacidad:'LABORATORIO'})
 actualizarReferencia(@Contexto() c:ContextoAutenticado,@Bundle() b:BundleInstitucional,@Param('tipo') tipo:string,@Param('id') id:string,@Headers('idempotency-key') k:string,@Body() e:unknown,@Res({passthrough:true}) r:Response){return this.referencia(tipo,c,b,id,k,e,r);}

 private async muestra(accion:AccionMuestra,contexto:ContextoAutenticado,bundle:BundleInstitucional,id:string|undefined,clave:string,entrada:unknown,res:Response){return this.escribir(this.gestionarMuestra.ejecutar(accion,{contexto,bundle,...(id?{id:uuidPublico(id)}:{}),claveIdempotencia:uuidPublico(clave),entrada}),clave,res);}
 private referencia(tipo:string,contexto:ContextoAutenticado,bundle:BundleInstitucional,id:string|undefined,clave:string,entrada:unknown,res:Response){return this.escribir(this.guardarReferencia.ejecutar(tipoReferencia(tipo),{contexto,bundle,...(id?{id:uuidPublico(id)}:{}),claveIdempotencia:uuidPublico(clave),entrada}),clave,res);}
 private async escribir(promesa:Promise<Escritura>,clave:string,res:Response){const resultado=await promesa;res.set('idempotency-key',clave);res.status(resultado.httpStatus);return resultado.respuesta;}
}

function consultaEscalarVacia(query:unknown){if(Object.keys(consultaEscalar(query)).length)throw solicitudInvalida('La ruta no acepta parámetros de consulta.');}
function tipoCatalogo(valor:string):TipoCatalogoLaboratorio{const mapa:Record<string,TipoCatalogoLaboratorio>={solicitantes:'solicitantes','tipos-muestra':'tiposMuestra',metodos:'metodos',pruebas:'pruebas',proveedores:'proveedores'};const tipo=mapa[valor];if(!tipo)throw solicitudInvalida('Catálogo inválido.','tipo');return tipo;}
function tipoReferencia(valor:string):TipoReferenciaAdministrativa{const mapa:Record<string,TipoReferenciaAdministrativa>={solicitantes:'solicitante','tipos-muestra':'tipoMuestra',proveedores:'proveedor'};const tipo=mapa[valor];if(!tipo)throw solicitudInvalida('Referencia inválida.','tipo');return tipo;}
