import {Body,Controller,Get,Headers,Param,Post,Query,Res} from '@nestjs/common';
import type {Response} from 'express';
import {Bundle,Contexto,RequiereAcceso} from '../decoradores-auth.js';
import type {ContextoAutenticado} from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type {BundleInstitucional} from '../../../../aplicacion/puertos/bundle-institucional.js';
import {GestionarCobrosLaboratorio} from '../../../../aplicacion/casos-uso/laboratorio/gestionar-cobros.js';
import {ConsultarCobrosLaboratorio} from '../../../../aplicacion/casos-uso/laboratorio/consultar-cobros.js';
import {objetoCerrado} from '../../../../dominio/clinica/consulta.js';
import {uuidPublico} from '../../../../dominio/compartido/uuid.js';
import {solicitudInvalida} from '../../../../dominio/compartido/error-dominio.js';
function queryEscalar(q:unknown){
 const e={...objetoCerrado(q,['ordenId','pacienteId','estado','desde','hasta','limite','orden','cursor'])};
 for(const [k,v]of Object.entries(e)){if(typeof v!=='string')throw solicitudInvalida('Filtro escalar obligatorio.',k);if(k==='limite'){if(!/^[1-9]\d{0,2}$/.test(v))throw solicitudInvalida('Límite inválido.');e[k]=Number(v);}}
 return e;
}
@Controller('laboratorio/facturas')
@RequiereAcceso({permisos:['cobros.administrar'],capacidad:'LABORATORIO'})
export class CobrosLaboratorioController {
 constructor(private readonly comandos:GestionarCobrosLaboratorio,private readonly consultas:ConsultarCobrosLaboratorio){}
 @Get()
 async listar(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Query() query:unknown){const pagina=await this.consultas.listar('facturas',{contexto,bundle,entrada:queryEscalar(query)});return {data:pagina.elementos,meta:{correlacion:contexto.correlacion,...(pagina.siguienteCursor?{siguiente_cursor:pagina.siguienteCursor}:{})}};}
 @Get(':id')
 detalle(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('id') id:string,@Query() query:unknown){objetoCerrado(query,[]);return this.consultas.detalle({contexto,bundle,id:uuidPublico(id)});}
 @Get(':id/pagos')
 async pagos(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('id') id:string,@Query() query:unknown){const pagina=await this.consultas.listar('pagos',{contexto,bundle,id:uuidPublico(id),entrada:queryEscalar(query)});return {data:pagina.elementos,meta:{correlacion:contexto.correlacion,...(pagina.siguienteCursor?{siguiente_cursor:pagina.siguienteCursor}:{})}};}
 @Post()
 emitir(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Body() entrada:unknown,@Headers('idempotency-key') clave:string,@Query() query:unknown,@Res({passthrough:true}) res:Response){objetoCerrado(query,[]);return this.escribir('emitir',contexto,bundle,entrada,clave,res);}
 @Post(':id/pagos')
 pagar(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('id') id:string,@Body() entrada:unknown,@Headers('idempotency-key') clave:string,@Query() query:unknown,@Res({passthrough:true}) res:Response){objetoCerrado(query,[]);return this.escribir('pagar',contexto,bundle,entrada,clave,res,uuidPublico(id));}
 @Post(':id/reversiones')
 revertir(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('id') id:string,@Body() entrada:unknown,@Headers('idempotency-key') clave:string,@Query() query:unknown,@Res({passthrough:true}) res:Response){objetoCerrado(query,[]);return this.escribir('revertir',contexto,bundle,entrada,clave,res,uuidPublico(id));}
 @Post(':id/anulacion')
 anular(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('id') id:string,@Body() entrada:unknown,@Headers('idempotency-key') clave:string,@Query() query:unknown,@Res({passthrough:true}) res:Response){objetoCerrado(query,[]);return this.escribir('anular',contexto,bundle,entrada,clave,res,uuidPublico(id));}
 private async escribir(accion:'emitir'|'pagar'|'revertir'|'anular',contexto:ContextoAutenticado,bundle:BundleInstitucional,entrada:unknown,clave:string,res:Response,id?:string){const r=await this.comandos.ejecutar(accion,{contexto,bundle,entrada,claveIdempotencia:uuidPublico(clave),...(id?{id:uuidPublico(id)}:{})});res.status(r.httpStatus);return {data:r.respuesta,meta:{correlacion:r.correlacionOriginal}};}
}
