import {
  Body,
  Controller,
  Get,
  HttpException,
  Module,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AppModule } from '../../src/composicion/app.module.js';
import type { ConfiguracionAplicacion } from '../../src/configuracion/entorno.js';

class EcoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  texto!: string;
}

@ApiExcludeController()
@Controller('pruebas-http')
class ControladorPruebaHttp {
  @Post('eco')
  eco(@Body() entrada: EcoDto) {
    return { texto: entrada.texto };
  }

  @Get('error')
  error(): never {
    throw new Error('secreto-interno-de-prueba');
  }

  @Get('no-encontrado')
  noEncontrado(): never {
    throw new NotFoundException('detalle-interno-de-prueba');
  }

  @Get('http-error/:status')
  errorHttp(@Param('status') status: string): never {
    throw new HttpException('detalle-interno-de-prueba', Number(status));
  }
}

export function moduloPruebaHttp(configuracion: ConfiguracionAplicacion) {
  @Module({
    imports: [AppModule.registrar(configuracion)],
    controllers: [ControladorPruebaHttp],
  })
  class ModuloPruebaHttp {}

  return ModuloPruebaHttp;
}
