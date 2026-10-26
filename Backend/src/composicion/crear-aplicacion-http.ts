import {
  type DynamicModule,
  type INestApplication,
  type Type,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { json } from 'express';
import { FiltroErroresHttp } from '../adaptadores/entrada/http/filtro-errores.js';
import { middlewareErroresParser } from '../adaptadores/entrada/http/errores-parser.middleware.js';
import { middlewareCorrelacion } from '../adaptadores/entrada/http/correlacion.middleware.js';
import { RespuestaInterceptor } from '../adaptadores/entrada/http/respuesta.interceptor.js';
import { crearPipeValidacion } from '../adaptadores/entrada/http/validacion.pipe.js';

const PREFIJO_API = 'api/v1';

export async function crearAplicacionHttp(
  modulo: Type<unknown> | DynamicModule,
  contrato: OpenAPIObject,
): Promise<INestApplication> {
  const app = await NestFactory.create(modulo, {
    bodyParser: false,
    logger: false,
  });
  app.setGlobalPrefix(PREFIJO_API);
  app.use(middlewareCorrelacion);
  app.use(json({ limit: 262_144, strict: true }));
  app.use(middlewareErroresParser);
  app.useGlobalPipes(crearPipeValidacion());
  app.useGlobalInterceptors(new RespuestaInterceptor());
  app.useGlobalFilters(new FiltroErroresHttp());

  SwaggerModule.setup('docs', app, contrato, {
    useGlobalPrefix: true,
    jsonDocumentUrl: 'openapi.json',
    yamlDocumentUrl: 'openapi.yaml',
    raw: ['json', 'yaml'],
    swaggerOptions: { url: '/api/v1/openapi.json' },
    customSiteTitle: 'Entrega II · Contrato API',
  });

  return app;
}
