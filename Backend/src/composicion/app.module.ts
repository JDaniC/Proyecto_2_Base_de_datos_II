import { DynamicModule, Module } from '@nestjs/common';
import { ConsultarBundlesConfigurados } from '../aplicacion/casos-uso/consultar-bundles-configurados.js';
import type { ConfiguracionAplicacion } from '../configuracion/entorno.js';
import { HealthController } from '../adaptadores/entrada/http/health.controller.js';
import { crearBundlesInstitucionales } from './crear-bundles-institucionales.js';
import {
  BUNDLES_INSTITUCIONALES,
  CONSULTAR_BUNDLES_CONFIGURADOS,
} from './tokens.js';

@Module({ controllers: [HealthController] })
export class AppModule {
  static registrar(configuracion: ConfiguracionAplicacion): DynamicModule {
    return {
      module: AppModule,
      providers: [
        {
          provide: BUNDLES_INSTITUCIONALES,
          useFactory: () =>
            crearBundlesInstitucionales(configuracion.instituciones),
        },
        {
          provide: CONSULTAR_BUNDLES_CONFIGURADOS,
          useFactory: (bundles: ReturnType<typeof crearBundlesInstitucionales>) =>
            new ConsultarBundlesConfigurados(bundles),
          inject: [BUNDLES_INSTITUCIONALES],
        },
      ],
      exports: [BUNDLES_INSTITUCIONALES, CONSULTAR_BUNDLES_CONFIGURADOS],
    };
  }
}
