import { Body, Controller, Headers, HttpCode, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Bundle, Contexto, RequiereAcceso } from '../decoradores-auth.js';
import type { ContextoAutenticado } from '../../../../aplicacion/puertos/contexto-autenticado.js';
import type { BundleInstitucional } from '../../../../aplicacion/puertos/bundle-institucional.js';
import { uuidPublico } from '../../../../dominio/compartido/uuid.js';
import { GestionarResponsable } from '../../../../aplicacion/casos-uso/pediatria/gestionar-responsable.js';

@Controller('pacientes/:pacienteId/responsables')
export class ResponsablesController {
  constructor(private readonly gestionar: GestionarResponsable) {}

  @Post(':id/contacto')
  @HttpCode(200)
  @RequiereAcceso({permisos:['pacientes.administrar'],capacidad:'PACIENTES'})
  contacto(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,
    @Param('pacienteId') pacienteId:string,@Param('id') id:string,@Headers('idempotency-key') clave:string,
    @Body() entrada:unknown,@Res({passthrough:true}) res:Response) {
    return this.ejecutar('contacto',contexto,bundle,pacienteId,id,clave,entrada,res);
  }

  @Post(':id/vinculo')
  @HttpCode(200)
  @RequiereAcceso({permisos:['pacientes.administrar'],capacidad:'PACIENTES'})
  vinculo(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,
    @Param('pacienteId') pacienteId:string,@Param('id') id:string,@Headers('idempotency-key') clave:string,
    @Body() entrada:unknown,@Res({passthrough:true}) res:Response) {
    return this.ejecutar('vinculo',contexto,bundle,pacienteId,id,clave,entrada,res);
  }

  @Post(':id/baja')
  @HttpCode(200)
  @RequiereAcceso({permisos:['pacientes.administrar'],capacidad:'PACIENTES'})
  baja(@Contexto() contexto:ContextoAutenticado,@Bundle() bundle:BundleInstitucional,
    @Param('pacienteId') pacienteId:string,@Param('id') id:string,@Headers('idempotency-key') clave:string,
    @Body() entrada:unknown,@Res({passthrough:true}) res:Response) {
    return this.ejecutar('baja',contexto,bundle,pacienteId,id,clave,entrada,res);
  }

  private async ejecutar(accion:'contacto'|'vinculo'|'baja',contexto:ContextoAutenticado,bundle:BundleInstitucional,
    pacienteId:string,id:string,clave:string,entrada:unknown,res:Response) {
    const r=await this.gestionar.ejecutar(accion,{contexto,bundle,id:uuidPublico(pacienteId),claveIdempotencia:uuidPublico(clave),entrada},id);
    res.status(r.httpStatus);
    return {data:r.respuesta,meta:{correlacion:r.correlacionOriginal}};
  }
}
