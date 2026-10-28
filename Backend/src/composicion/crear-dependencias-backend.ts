import { randomUUID } from 'node:crypto';
import { applicationDefault, deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import type { BundlesInstitucionales } from '../aplicacion/puertos/bundle-institucional.js';
import type { AdministradorIdentidad } from '../aplicacion/puertos/administrador-identidad.js';
import type { BloqueoProvision } from '../aplicacion/puertos/bloqueo-provision.js';
import type { VerificadorIdentidad } from '../aplicacion/puertos/verificador-identidad.js';
import { AdministradorCuentasFirebase } from '../adaptadores/salida/identidad/administrador-cuentas-firebase.js';
import { BloqueoProvisionPostgresql } from '../adaptadores/salida/identidad/bloqueo-provision-postgresql.js';
import { VerificadorIdentidadFirebase } from '../adaptadores/salida/identidad/verificador-identidad-firebase.js';
import { crearPoolPostgresql } from '../adaptadores/salida/postgresql/crear-pool-postgresql.js';
import { crearPoolMysql } from '../adaptadores/salida/mysql/crear-pool-mysql.js';
import { crearClienteMongodb } from '../adaptadores/salida/mongodb/crear-cliente-mongodb.js';
import { crearClienteFirestore } from '../adaptadores/salida/firestore/crear-cliente-firestore.js';
import { crearRepositorioCuentaInstitucionalPostgresql, crearRepositorioCuentaInstitucionalMysql } from '../adaptadores/salida/identidad/repositorios-cuenta-sql.js';
import { crearBundlePacientesMongodb } from '../adaptadores/salida/mongodb/pacientes/crear-bundle-pacientes-mongodb.js';
import { crearRepositorioCuentaInstitucionalFirestore } from '../adaptadores/salida/identidad/repositorio-cuenta-firestore-institucional.js';
import { parsearConfiguracionSql } from '../configuracion/conexiones-sql.js';
import { parsearConfiguracionMongodb } from '../configuracion/conexiones-mongodb.js';
import { parsearConfiguracionFirestore } from '../configuracion/conexiones-firestore.js';
import { INSTITUCIONES_CANONICAS } from '../dominio/compartido/institucion.js';
import { crearBundlesInstitucionales, type MapaRepositoriosInstitucion } from './crear-bundles-institucionales.js';

export interface DependenciasBackend {
  readonly bundles: BundlesInstitucionales;
  readonly bloqueoProvision: BloqueoProvision;
  readonly verificadorIdentidad: VerificadorIdentidad;
  readonly administradorIdentidad: AdministradorIdentidad;
  readonly cerrar: () => Promise<void>;
}

const GRUPOS_CONFIGURACION: readonly (readonly string[])[] = [
  ['POSTGRES_HOST'], ['POSTGRES_PORT'], ['POSTGRES_PASSWORD_FILE'],
  ['MYSQL_HOST'], ['MYSQL_PORT'], ['MYSQL_PASSWORD_FILE'],
  ['MONGO_HOST'], ['MONGO_PORT'], ['MONGO_APP_PASSWORD_FILE', 'MONGO_PASSWORD_FILE'],
  ['FIRESTORE_PROJECT_ID', 'GCP_PROJECT', 'GOOGLE_CLOUD_PROJECT'],
] as const;

/**
 * En ambientes de desarrollo sin infraestructura deja los bundles desconectados.
 * Nunca instala datos de prueba como fallback; en delivery exige los cuatro motores.
 */
export async function crearDependenciasBackend(
  variables: Readonly<Record<string, string | undefined>>,
): Promise<DependenciasBackend | null> {
  const hayConfiguracion = GRUPOS_CONFIGURACION.some((grupo) =>
    grupo.some((nombre) => variables[nombre]?.trim()),
  ) || Boolean(variables.FIREBASE_AUTH_PROJECT_ID?.trim());
  if (!hayConfiguracion && variables.APP_ENV !== 'delivery') return null;

  const faltantes = GRUPOS_CONFIGURACION
    .filter((grupo) => !grupo.some((nombre) => variables[nombre]?.trim()))
    .map((grupo) => grupo[0]!);
  if (variables.FIREBASE_AUTH_PROJECT_ID !== undefined &&
      variables.FIREBASE_AUTH_PROJECT_ID.trim().length === 0) {
    faltantes.push('FIREBASE_AUTH_PROJECT_ID');
  }
  if (faltantes.length > 0) throw new ErrorConfiguracionBackend(faltantes);

  const sql = parsearConfiguracionSql(variables);
  const mongodb = parsearConfiguracionMongodb(variables);
  const firestoreConfig = parsearConfiguracionFirestore(variables);
  const projectIdAuth = (variables.FIREBASE_AUTH_PROJECT_ID ?? firestoreConfig.projectId).trim();
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectIdAuth) || projectIdAuth !== firestoreConfig.projectId) {
    throw new ErrorConfiguracionBackend(['FIREBASE_AUTH_PROJECT_ID', 'FIRESTORE_PROJECT_ID']);
  }

  const hostEmuladorAuth = variables.FIREBASE_AUTH_EMULATOR_HOST?.trim();
  if (hostEmuladorAuth && !hostEmuladorLocalValido(hostEmuladorAuth)) {
    throw new ErrorConfiguracionBackend(['FIREBASE_AUTH_EMULATOR_HOST']);
  }
  const hostEmuladorFirestore = firestoreConfig.emulatorHost;
  const usaEmuladorAuth = Boolean(hostEmuladorAuth);
  const usaEmuladorFirestore = Boolean(hostEmuladorFirestore);
  const usaProyectoDemo = projectIdAuth.startsWith('demo-');
  if (usaEmuladorAuth !== usaEmuladorFirestore || usaEmuladorAuth !== usaProyectoDemo) {
    throw new ErrorConfiguracionBackend([
      'FIREBASE_AUTH_PROJECT_ID', 'FIREBASE_AUTH_EMULATOR_HOST',
      'FIRESTORE_PROJECT_ID', 'FIRESTORE_EMULATOR_HOST',
    ]);
  }

  const cierres: Array<() => Promise<void>> = [];
  let hostAuthOriginal: string | undefined;
  try {
    const postgresql = await crearPoolPostgresql(sql.postgresql);
    cierres.push(() => postgresql.cerrar());
    const mysql = await crearPoolMysql(sql.mysql);
    cierres.push(() => mysql.cerrar());
    const mongo = await crearClienteMongodb(mongodb);
    cierres.push(() => mongo.cerrar());
    const firebase = crearClienteFirestore(firestoreConfig);
    cierres.push(() => firebase.cerrar());

    if (hostEmuladorAuth) {
      hostAuthOriginal = process.env.FIREBASE_AUTH_EMULATOR_HOST;
      process.env.FIREBASE_AUTH_EMULATOR_HOST = hostEmuladorAuth;
    }
    const appAuth = crearAppIdentidad(projectIdAuth, Boolean(hostEmuladorAuth));
    cierres.push(() => deleteApp(appAuth));
    const auth: Auth = getAuth(appAuth);

    const repositorios: MapaRepositoriosInstitucion = {
      HOSPITAL_GENERAL: { cuenta: crearRepositorioCuentaInstitucionalPostgresql(postgresql) },
      CLINICA_ODONTOLOGICA: { cuenta: crearRepositorioCuentaInstitucionalMysql(mysql) },
      LABORATORIO_CLINICO: await crearBundlePacientesMongodb(mongo),
      CENTRO_MEDICO_PEDIATRICO: { cuenta: crearRepositorioCuentaInstitucionalFirestore(firebase) },
    };
    const cerrar = async (): Promise<void> => {
      const errores: unknown[] = [];
      for (const cerrarRecurso of [...cierres].reverse()) {
        try { await cerrarRecurso(); } catch (error: unknown) { errores.push(error); }
      }
      if (hostEmuladorAuth) {
        if (hostAuthOriginal === undefined) delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
        else process.env.FIREBASE_AUTH_EMULATOR_HOST = hostAuthOriginal;
      }
      if (errores.length > 0) throw new Error('BACKEND_RESOURCE_CLOSE_FAILED');
    };

    return Object.freeze({
      bundles: crearBundlesInstitucionales(INSTITUCIONES_CANONICAS, repositorios),
      bloqueoProvision: new BloqueoProvisionPostgresql(postgresql),
      verificadorIdentidad: new VerificadorIdentidadFirebase(auth),
      administradorIdentidad: new AdministradorCuentasFirebase(auth),
      cerrar,
    });
  } catch (error: unknown) {
    for (const cerrarRecurso of [...cierres].reverse()) {
      try { await cerrarRecurso(); } catch { /* Conserva el error de inicialización original. */ }
    }
    if (hostEmuladorAuth) {
      if (hostAuthOriginal === undefined) delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
      else process.env.FIREBASE_AUTH_EMULATOR_HOST = hostAuthOriginal;
    }
    throw error;
  }
}

function hostEmuladorLocalValido(host: string): boolean {
  const coincidencia = /^(127\.0\.0\.1|localhost):([0-9]{1,5})$/.exec(host);
  if (!coincidencia) return false;
  const puerto = Number(coincidencia[2]);
  return Number.isInteger(puerto) && puerto >= 1 && puerto <= 65_535;
}

export class ErrorConfiguracionBackend extends Error {
  constructor(readonly variables: readonly string[]) {
    super('INVALID_BACKEND_RUNTIME_CONFIGURATION');
    this.name = 'ErrorConfiguracionBackend';
    Object.freeze(this.variables);
  }
}

function crearAppIdentidad(projectId: string, emulador: boolean): App {
  return initializeApp({
    projectId,
    ...(emulador ? {} : { credential: applicationDefault() }),
  }, `backend-identidad-${randomUUID()}`);
}
