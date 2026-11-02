import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Bundle, Contexto, RequiereAcceso } from '../decoradores-auth.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../../../aplicacion/puertos/bundle-institucional.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { objetoCerrado } from '../../../../dominio/clinica/consulta.js';
import { GestionarAntecedentes } from '../../../../aplicacion/casos-uso/pediatria/gestionar-antecedentes.js';
import { ConsultarAntecedentes } from '../../../../aplicacion/casos-uso/pediatria/consultar-antecedentes.js';
@Controller('pacientes/:pacienteId/antecedentes-pediatricos')
export class AntecedentesController {
  constructor(private readonly gestionar:GestionarAntecedentes,private readonly consultar:ConsultarAntecedentes){}
  @Get('')
  @RequiereAcceso({permisos:['historial.leer'],capacidad:'PACIENTES'})
  leer(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('pacienteId') id:string,@Query() query:unknown){
    objetoCerrado(query,[]);return this.consultar.ejecutar(contexto,bundle,id);
  }
  @Post('alergias')
  @HttpCode(200)
  @RequiereAcceso({permisos:['consultas.registrar'],capacidad:'PACIENTES'})
  alergia(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('pacienteId') id:string,
    @Headers('idempotency-key') clave:string,@Body() entrada:unknown,@Res({passthrough:true}) res:Response){
    return this.ejecutar('alergia',contexto,bundle,id,clave,entrada,res);
  }
  @Post('alergias/baja')
  @HttpCode(200)
  @RequiereAcceso({permisos:['consultas.registrar'],capacidad:'PACIENTES'})
  bajaAlergia(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('pacienteId') id:string,
    @Headers('idempotency-key') clave:string,@Body() entrada:unknown,@Res({passthrough:true}) res:Response){
    return this.ejecutar('bajaAlergia',contexto,bundle,id,clave,entrada,res);
  }
  @Post('sin-alergias')
  @HttpCode(200)
  @RequiereAcceso({permisos:['consultas.registrar'],capacidad:'PACIENTES'})
  sinAlergias(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('pacienteId') id:string,
    @Headers('idempotency-key') clave:string,@Body() entrada:unknown,@Res({passthrough:true}) res:Response){
    return this.ejecutar('sinAlergias',contexto,bundle,id,clave,entrada,res);
  }
  @Post('perinatales')
  @HttpCode(200)
  @RequiereAcceso({permisos:['consultas.registrar'],capacidad:'PACIENTES'})
  perinatales(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,@Param('pacienteId') id:string,
    @Headers('idempotency-key') clave:string,@Body() entrada:unknown,@Res({passthrough:true}) res:Response){
    return this.ejecutar('perinatales',contexto,bundle,id,clave,entrada,res);
  }
  private async ejecutar(accion:'alergia'|'bajaAlergia'|'sinAlergias'|'perinatales',contexto:ContextoAutenticado,bundle:BundleInstitucional,id:string,clave:string,entrada:unknown,res:Response){
    const r=await this.gestionar.ejecutar(accion,{contexto,bundle,id:uuidPublico(id),claveIdempotencia:uuidPublico(clave),entrada});
    res.status(r.httpStatus);return {data:r.respuesta,meta:{correlacion:r.correlacionOriginal}};
  }
}
