import { GestionarCatalogoVacunas } from '../aplicacion/casos-uso/pediatria/gestionar-catalogo-vacunas.js';
import { AsignarEsquemaVacuna } from '../aplicacion/casos-uso/pediatria/asignar-esquema.js';
import { VacunasController } from '../adaptadores/entrada/http/pediatria/vacunas.controller.js';
import { ConsultarEsquemaVacunas } from '../aplicacion/casos-uso/pediatria/consultar-esquema-vacunas.js';
import { ConsultarAplicacionesVacuna } from '../aplicacion/casos-uso/pediatria/consultar-aplicaciones.js';
import { RegistrarAplicacionVacuna } from '../aplicacion/casos-uso/pediatria/registrar-aplicacion.js';
import { CorregirAplicacionVacuna } from '../aplicacion/casos-uso/pediatria/corregir-aplicacion.js';
import { AnularAplicacionVacuna } from '../aplicacion/casos-uso/pediatria/anular-aplicacion.js';
import { ConsultarResponsable } from '../aplicacion/casos-uso/pediatria/consultar-responsable.js';
import { ConsultarCrecimiento } from '../aplicacion/casos-uso/pediatria/consultar-crecimiento.js';
import { AntecedentesController } from '../adaptadores/entrada/http/pediatria/antecedentes.controller.js';
import { GestionarAntecedentes } from '../aplicacion/casos-uso/pediatria/gestionar-antecedentes.js';
import { ConsultarAntecedentes } from '../aplicacion/casos-uso/pediatria/consultar-antecedentes.js';
import { ResponsablesController } from '../adaptadores/entrada/http/pediatria/responsables.controller.js';
import { GestionarResponsable } from '../aplicacion/casos-uso/pediatria/gestionar-responsable.js';
import { ServiciosHospitalarios } from '../aplicacion/casos-uso/hospital/servicios-hospitalarios.js';
import { ServiciosHospitalariosController } from '../adaptadores/entrada/http/hospital/servicios-hospitalarios.controller.js';
import { CambiarEstadoHistorial } from '../aplicacion/casos-uso/historiales/cambiar-estado-historial.js';
import { AtencionClinica } from '../aplicacion/casos-uso/consultas/atencion-clinica.js';
import { ConsultarConsulta } from '../aplicacion/casos-uso/consultas/consultar-consulta.js';
import { GestionarCitas } from '../aplicacion/casos-uso/citas/gestionar-citas.js';
import { ConsultarCitas } from '../aplicacion/casos-uso/citas/consultar-citas.js';
import { ConsultasController } from '../adaptadores/entrada/http/consultas/consultas.controller.js';
import { CitasController } from '../adaptadores/entrada/http/citas/citas.controller.js';
import { ConsultarHistorial } from '../aplicacion/casos-uso/historiales/consultar-historial.js';
import {
  ActualizarAntecedentesClinicos,
  ConsultarAntecedentesClinicos,
} from '../aplicacion/casos-uso/pacientes/antecedentes-clinicos.js';
import { ConsultarCatalogosClinicos } from '../aplicacion/casos-uso/clinica/consultar-catalogos-clinicos.js';
import { CursorHistorialCifrado } from '../adaptadores/salida/historial/cursor-historial.js';
import { ConsultarHospitalizaciones } from '../aplicacion/casos-uso/hospital/consultar-hospitalizaciones.js';
import { GestionarHospitalizaciones } from '../aplicacion/casos-uso/hospital/gestionar-hospitalizaciones.js';
import { HospitalController } from '../adaptadores/entrada/http/hospital/hospital.controller.js';
import { HistorialesController } from '../adaptadores/entrada/http/historiales/historiales.controller.js';
import { CatalogosController } from '../adaptadores/entrada/http/catalogos/catalogos.controller.js';
import { DynamicModule, Module, type OnModuleDestroy } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ConsultarBundlesConfigurados } from '../aplicacion/casos-uso/consultar-bundles-configurados.js';
import { CerrarSesion } from '../aplicacion/casos-uso/cuentas/cerrar-sesion.js';
import { EstablecerSesion } from '../aplicacion/casos-uso/cuentas/establecer-sesion.js';
import { ObtenerSesionActual } from '../aplicacion/casos-uso/cuentas/obtener-sesion-actual.js';
import { RegistrarPaciente } from '../aplicacion/casos-uso/pacientes/registrar-paciente.js';
import { ActualizarPaciente } from '../aplicacion/casos-uso/pacientes/actualizar-paciente.js';
import { ConsultarPaciente } from '../aplicacion/casos-uso/pacientes/consultar-paciente.js';
import { BuscarPacientes } from '../aplicacion/casos-uso/pacientes/buscar-pacientes.js';
import type { BundlesInstitucionales } from '../aplicacion/puertos/bundle-institucional.js';
import type { VerificadorIdentidad } from '../aplicacion/puertos/verificador-identidad.js';
import { ErrorDominio } from '../dominio/compartido/error-dominio.js';
import type { ConfiguracionAplicacion } from '../configuracion/entorno.js';
import { GuardiaAutenticacion } from '../adaptadores/entrada/http/guardia-autenticacion.js';
import { GuardiaAutorizacion } from '../adaptadores/entrada/http/guardia-autorizacion.js';
import { HealthController } from '../adaptadores/entrada/http/health.controller.js';
import { SesionController } from '../adaptadores/entrada/http/sesion.controller.js';
import { PacientesController } from '../adaptadores/entrada/http/pacientes/pacientes.controller.js';
import { dependenciasComandoPorDefecto } from '../adaptadores/salida/sistema/servicios-sistema.js';
import { crearBundlesInstitucionales } from './crear-bundles-institucionales.js';
import {
  BUNDLES_INSTITUCIONALES,
  CONSULTAR_BUNDLES_CONFIGURADOS,
  ESTABLECER_SESION,
  RECURSOS_BACKEND,
  VERIFICADOR_IDENTIDAD,
} from './tokens.js';

export interface DependenciasAplicacion {
  readonly bundles?: BundlesInstitucionales;
  readonly verificadorIdentidad?: VerificadorIdentidad;
  readonly cerrarRecursos?: () => Promise<void>;
}

class LimpiadorRecursos implements OnModuleDestroy {
  constructor(private readonly cerrar: () => Promise<void>) {}
  onModuleDestroy(): Promise<void> { return this.cerrar(); }
}

const VERIFICADOR_NO_CONFIGURADO: VerificadorIdentidad = Object.freeze({
  async verificar() {
    throw new ErrorDominio('IDENTIDAD_NO_DISPONIBLE', 'El proveedor de identidad no está configurado.');
  },
  async revocarSesiones() {
    throw new ErrorDominio('IDENTIDAD_NO_DISPONIBLE', 'El proveedor de identidad no está configurado.');
  },
});

@Module({ controllers: [VacunasController, AntecedentesController, ResponsablesController, ServiciosHospitalariosController, HospitalController, ConsultasController, CitasController, CatalogosController, HealthController, SesionController, PacientesController, HistorialesController] })
export class AppModule {
  static registrar(
    configuracion: ConfiguracionAplicacion,
    dependencias: DependenciasAplicacion = {},
  ): DynamicModule {
    const bundles = dependencias.bundles ?? crearBundlesInstitucionales(configuracion.instituciones);
    const verificadorIdentidad = dependencias.verificadorIdentidad ?? VERIFICADOR_NO_CONFIGURADO;
    return {
      module: AppModule,
      providers: [
        {provide:GestionarCatalogoVacunas,useFactory:()=>new GestionarCatalogoVacunas(dependenciasComandoPorDefecto)},
        {provide: AsignarEsquemaVacuna,useFactory:()=>new AsignarEsquemaVacuna(dependenciasComandoPorDefecto)},
        {provide: ConsultarEsquemaVacunas, useFactory: () => new ConsultarEsquemaVacunas()},
        {provide: ConsultarAplicacionesVacuna, useFactory: () => new ConsultarAplicacionesVacuna()},
        {provide: RegistrarAplicacionVacuna, useFactory: () => new RegistrarAplicacionVacuna(dependenciasComandoPorDefecto)},
        {provide: CorregirAplicacionVacuna, useFactory: () => new CorregirAplicacionVacuna(dependenciasComandoPorDefecto)},
        {provide: AnularAplicacionVacuna, useFactory: () => new AnularAplicacionVacuna(dependenciasComandoPorDefecto)},

        {provide: GestionarAntecedentes,useFactory:()=>new GestionarAntecedentes(dependenciasComandoPorDefecto)},
        {provide: ConsultarResponsable,useFactory:()=>new ConsultarResponsable()},
        {provide: ConsultarCrecimiento,useFactory:()=>new ConsultarCrecimiento()},
        {provide: ConsultarAntecedentes,useFactory:()=>new ConsultarAntecedentes()},
        { provide: GestionarResponsable, useFactory: () => new GestionarResponsable(dependenciasComandoPorDefecto) },
        {provide: CambiarEstadoHistorial, useFactory: () => new CambiarEstadoHistorial(dependenciasComandoPorDefecto)},
        { provide: AtencionClinica, useFactory: () => new AtencionClinica(dependenciasComandoPorDefecto) },
        { provide: GestionarCitas, useFactory: () => new GestionarCitas(dependenciasComandoPorDefecto) },
        { provide: ConsultarCitas, useFactory: () => new ConsultarCitas() },
        { provide: ConsultarConsulta, useFactory: () => new ConsultarConsulta() },
        { provide: ConsultarHistorial, useFactory: () => new ConsultarHistorial(new CursorHistorialCifrado()) },
        { provide: ConsultarAntecedentesClinicos, useFactory: () => new ConsultarAntecedentesClinicos() },
        { provide: ActualizarAntecedentesClinicos, useFactory: () => new ActualizarAntecedentesClinicos(dependenciasComandoPorDefecto) },
        { provide: ConsultarCatalogosClinicos, useFactory: () => new ConsultarCatalogosClinicos() },
        { provide: ConsultarHospitalizaciones, useFactory: () => new ConsultarHospitalizaciones() },
        { provide: ServiciosHospitalarios, useFactory: () => new ServiciosHospitalarios() },
        { provide: GestionarHospitalizaciones, useFactory: () => new GestionarHospitalizaciones() },
        {
          provide: BUNDLES_INSTITUCIONALES,
          useValue: bundles,
        },
        {
          provide: VERIFICADOR_IDENTIDAD,
          useValue: verificadorIdentidad,
        },
        ...(dependencias.cerrarRecursos ? [{
          provide: RECURSOS_BACKEND,
          useValue: new LimpiadorRecursos(dependencias.cerrarRecursos),
        }] : []),
        {
          provide: ESTABLECER_SESION,
          useFactory: (
            verificador: VerificadorIdentidad,
            configurados: BundlesInstitucionales,
          ) => new EstablecerSesion(
            verificador,
            (institucion) => configurados.find((bundle) => bundle.institucion === institucion),
          ),
          inject: [VERIFICADOR_IDENTIDAD, BUNDLES_INSTITUCIONALES],
        },
        {
          provide: ObtenerSesionActual,
          useClass: ObtenerSesionActual,
        },
        {
          provide: CerrarSesion,
          useFactory: (verificador: VerificadorIdentidad) => new CerrarSesion(verificador),
          inject: [VERIFICADOR_IDENTIDAD],
        },
        {
          provide: RegistrarPaciente,
          useFactory: () => new RegistrarPaciente(dependenciasComandoPorDefecto),
        },
        {
          provide: ActualizarPaciente,
          useFactory: () => new ActualizarPaciente(dependenciasComandoPorDefecto),
        },
        {
          provide: ConsultarPaciente,
          useClass: ConsultarPaciente,
        },
        {
          provide: BuscarPacientes,
          useClass: BuscarPacientes,
        },
        {
          provide: CONSULTAR_BUNDLES_CONFIGURADOS,
          useFactory: (bundles: ReturnType<typeof crearBundlesInstitucionales>) =>
            new ConsultarBundlesConfigurados(bundles),
          inject: [BUNDLES_INSTITUCIONALES],
        },
        {
          provide: APP_GUARD,
          useFactory: (establecerSesion: EstablecerSesion, reflector: Reflector) =>
            new GuardiaAutenticacion(reflector, establecerSesion),
          inject: [ESTABLECER_SESION, Reflector],
        },
        {
          provide: APP_GUARD,
          useClass: GuardiaAutorizacion,
        },
      ],
      exports: [
        BUNDLES_INSTITUCIONALES,
        CONSULTAR_BUNDLES_CONFIGURADOS,
        VERIFICADOR_IDENTIDAD,
        ESTABLECER_SESION,
      ],
    };
  }
}
