import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Auth } from 'firebase-admin/auth';
import { AdministradorCuentasFirebase } from '../../src/adaptadores/salida/identidad/administrador-cuentas-firebase.js';
import { VerificadorIdentidadFirebase } from '../../src/adaptadores/salida/identidad/verificador-identidad-firebase.js';
import { crearDependenciasBackend, ErrorConfiguracionBackend } from '../../src/composicion/crear-dependencias-backend.js';
import { ProvisionarCuentaPendiente } from '../../src/aplicacion/casos-uso/cuentas/provisionar-cuenta-pendiente.js';
import type { AdministradorIdentidad } from '../../src/aplicacion/puertos/administrador-identidad.js';
import type { BundleInstitucional } from '../../src/aplicacion/puertos/bundle-institucional.js';
import type { CuentaAutorizada } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { RepositorioCuenta } from '../../src/aplicacion/puertos/repositorio-cuenta.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import type { Rol } from '../../src/dominio/compartido/autorizacion.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';

const UID = 'firebase-test-user-001';
const ID_CUENTA = '10000000-0000-4000-8000-000000000001';

function firebaseAuth(funciones: Record<string, unknown>): Auth {
  return funciones as unknown as Auth;
}

test('el verificador exige comprobación de revocación y lee el claim institucional canónico', async () => {
  let revocacionComprobada = false;
  const auth = firebaseAuth({
    verifyIdToken: async (_token: string, checkRevoked: boolean) => {
      revocacionComprobada = checkRevoked;
      return { uid: UID, iat: 1_792_000_000, institucion: 'HOSPITAL_GENERAL' };
    },
  });

  const identidad = await new VerificadorIdentidadFirebase(auth).verificar('token-sintetico');

  assert.equal(revocacionComprobada, true);
  assert.deepEqual(identidad, {
    uid: UID,
    institucion: 'HOSPITAL_GENERAL',
    emitidoEn: '2026-10-14T17:46:40.000Z',
  });
});

test('el verificador rechaza token sin claim y el alias de pediatría con 403', async () => {
  for (const institucion of [undefined, 'CENTRO_PEDIATRICO']) {
    const auth = firebaseAuth({
      verifyIdToken: async () => ({ uid: UID, iat: 1_792_000_000, institucion }),
    });
    await assert.rejects(
      () => new VerificadorIdentidadFirebase(auth).verificar('token-sintetico'),
      (error: unknown) => error instanceof ErrorDominio && error.codigo === 'SIN_PERMISO',
    );
  }
});

test('el verificador separa token inválido de indisponibilidad de Firebase', async () => {
  const revocado = firebaseAuth({
    verifyIdToken: async () => { throw Object.assign(new Error('opaque'), { code: 'auth/id-token-revoked' }); },
  });
  await assert.rejects(
    () => new VerificadorIdentidadFirebase(revocado).verificar('token-sintetico'),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'NO_AUTENTICADO',
  );

  const fueraDeServicio = firebaseAuth({ verifyIdToken: async () => { throw new Error('private provider detail'); } });
  await assert.rejects(
    () => new VerificadorIdentidadFirebase(fueraDeServicio).verificar('token-sintetico'),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'IDENTIDAD_NO_DISPONIBLE',
  );
});

test('el cierre de sesión revoca solo el UID verificado y no filtra el error del proveedor', async () => {
  let uidRevocado: string | undefined;
  const auth = firebaseAuth({
    revokeRefreshTokens: async (uid: string) => { uidRevocado = uid; },
  });
  await new VerificadorIdentidadFirebase(auth).revocarSesiones(UID);
  assert.equal(uidRevocado, UID);

  await assert.rejects(
    () => new VerificadorIdentidadFirebase(firebaseAuth({
      revokeRefreshTokens: async () => { throw new Error('private provider detail'); },
    })).revocarSesiones(UID),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'IDENTIDAD_NO_DISPONIBLE' && !error.message.includes('private'),
  );
});

test('el administrador conserva otros claims, fija institución canónica y detecta conflicto', async () => {
  let claims: Record<string, unknown> = { preferencia: 'compacta' };
  const auth = firebaseAuth({
    getUser: async () => ({ uid: UID, customClaims: claims }),
    setCustomUserClaims: async (_uid: string, nuevos: Record<string, unknown>) => { claims = nuevos; },
  });
  await new AdministradorCuentasFirebase(auth).asegurarClaimInstitucion(UID, 'CLINICA_ODONTOLOGICA');
  assert.deepEqual(claims, { preferencia: 'compacta', institucion: 'CLINICA_ODONTOLOGICA' });

  claims = { institucion: 'HOSPITAL_GENERAL' };
  await assert.rejects(
    () => new AdministradorCuentasFirebase(auth).asegurarClaimInstitucion(UID, 'CLINICA_ODONTOLOGICA'),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'SIN_PERMISO',
  );
});

test('la composición rechaza un puerto de Auth Emulator fuera del rango antes de crear conexiones', async () => {
  await assert.rejects(
    () => crearDependenciasBackend({
      APP_ENV: 'delivery',
      POSTGRES_HOST: '127.0.0.1', POSTGRES_PORT: '5432', POSTGRES_PASSWORD_FILE: '/tmp/pg',
      MYSQL_HOST: '127.0.0.1', MYSQL_PORT: '3306', MYSQL_PASSWORD_FILE: '/tmp/mysql',
      MONGO_HOST: '127.0.0.1', MONGO_PORT: '27017', MONGO_APP_PASSWORD_FILE: '/tmp/mongo',
      FIRESTORE_PROJECT_ID: 'demo-bdii-pediatria', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8188',
      FIREBASE_AUTH_PROJECT_ID: 'demo-bdii-pediatria', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:65536',
    }),
    (error: unknown) => error instanceof ErrorConfiguracionBackend &&
      error.variables.includes('FIREBASE_AUTH_EMULATOR_HOST'),
  );
});

test('la provisión activa cuenta pendiente después del claim y devuelve resultado sin UID', async () => {
  let cuenta = crearCuenta('PENDIENTE');
  const estadosOrden: string[] = [];
  const repo = crearRepositorio({
    porUid: async () => cuenta,
    activarPendiente: async (_uid, version) => {
      estadosOrden.push('activar');
      assert.equal(version, versionPositiva(1));
      cuenta = crearCuenta('ACTIVA', 2);
      return true;
    },
  });
  const admin: AdministradorIdentidad = {
    async asegurarClaimInstitucion(uid, institucion) {
      estadosOrden.push('claim');
      assert.equal(uid, UID);
      assert.equal(institucion, 'HOSPITAL_GENERAL');
    },
  };

  const resultado = await crearProvision(repo, admin).ejecutar({ institucion: 'HOSPITAL_GENERAL', uid: UID });

  assert.deepEqual(estadosOrden, ['claim', 'activar']);
  assert.equal(resultado.estado, 'ACTIVA');
  assert.equal(resultado.version, versionPositiva(2));
  assert.equal('uid' in resultado, false);
});

test('si Firebase falla, la cuenta permanece pendiente y no se intenta escribir', async () => {
  let activaciones = 0;
  const repo = crearRepositorio({ activarPendiente: async () => { activaciones += 1; return true; } });
  const admin: AdministradorIdentidad = {
    async asegurarClaimInstitucion() { throw new ErrorDominio('IDENTIDAD_NO_DISPONIBLE', 'Identity unavailable.'); },
  };

  await assert.rejects(
    () => crearProvision(repo, admin).ejecutar({ institucion: 'HOSPITAL_GENERAL', uid: UID }),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'IDENTIDAD_NO_DISPONIBLE',
  );
  assert.equal(activaciones, 0);
});

test('si se interrumpe la activación, reanudar con la misma institución y UID completa la operación', async () => {
  let cuenta = crearCuenta('PENDIENTE');
  let intentos = 0;
  const repo = crearRepositorio({
    porUid: async () => cuenta,
    activarPendiente: async () => {
      intentos += 1;
      if (intentos === 1) throw new Error('database temporarily unavailable');
      cuenta = crearCuenta('ACTIVA', 2);
      return true;
    },
  });
  let claimsVerificados = 0;
  const admin: AdministradorIdentidad = {
    async asegurarClaimInstitucion() { claimsVerificados += 1; },
  };
  const provisión = crearProvision(repo, admin);
  const entrada = { institucion: 'HOSPITAL_GENERAL' as const, uid: UID };

  await assert.rejects(
    () => provisión.ejecutar(entrada),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );
  assert.equal(cuenta.estado, 'PENDIENTE');
  const reanudada = await provisión.ejecutar(entrada);
  assert.equal(reanudada.estado, 'ACTIVA');
  assert.equal(claimsVerificados, 2);
});

test('dos provisiones concurrentes de la misma cuenta convergen a una única versión activa', async () => {
  let cuenta = crearCuenta('PENDIENTE');
  const repo = crearRepositorio({
    porUid: async () => cuenta,
    activarPendiente: async () => {
      await Promise.resolve();
      if (cuenta.estado === 'ACTIVA') return true;
      cuenta = crearCuenta('ACTIVA', 2);
      return true;
    },
  });
  const admin: AdministradorIdentidad = { async asegurarClaimInstitucion() {} };
  const provisionar = crearProvision(repo, admin);
  const entrada = { institucion: 'HOSPITAL_GENERAL' as const, uid: UID };

  const resultados = await Promise.all([
    provisionar.ejecutar(entrada),
    provisionar.ejecutar(entrada),
  ]);

  assert.deepEqual(resultados.map((resultado) => resultado.version), [versionPositiva(2), versionPositiva(2)]);
  assert.equal(cuenta.estado, 'ACTIVA');
});

test('una cuenta activa permite reanudación idempotente y una inactiva no obtiene claim', async () => {
  let llamadasClaim = 0;
  let cuenta = crearCuenta('ACTIVA', 2);
  const repo = crearRepositorio({
    porUid: async () => cuenta,
    activarPendiente: async () => { throw new Error('must not change an active account'); },
  });
  const admin: AdministradorIdentidad = { async asegurarClaimInstitucion() { llamadasClaim += 1; } };
  const provisión = crearProvision(repo, admin);
  const entrada = { institucion: 'HOSPITAL_GENERAL' as const, uid: UID };
  const primera = await provisión.ejecutar(entrada);
  const segunda = await provisión.ejecutar(entrada);
  assert.equal(primera.version, segunda.version);
  assert.equal(llamadasClaim, 2);

  cuenta = crearCuenta('INACTIVA', 3);
  await assert.rejects(
    () => provisión.ejecutar(entrada),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'CUENTA_NO_HABILITADA',
  );
  assert.equal(llamadasClaim, 2);
});

test('la provisión rechaza UID vacío, vínculo profesional inactivo y bundle discordante', async () => {
  const repo = crearRepositorio({
    porUid: async () => crearCuenta('PENDIENTE', 1, false),
  });
  let claims = 0;
  const admin: AdministradorIdentidad = { async asegurarClaimInstitucion() { claims += 1; } };
  const provisionar = crearProvision(repo, admin);

  await assert.rejects(
    () => provisionar.ejecutar({ institucion: 'HOSPITAL_GENERAL', uid: ' ' }),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'SOLICITUD_INVALIDA',
  );
  await assert.rejects(
    () => provisionar.ejecutar({ institucion: 'HOSPITAL_GENERAL', uid: UID }),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'CUENTA_NO_HABILITADA',
  );
  assert.equal(claims, 0);

  const otroBundle = crearProvision(repo, admin, 'CLINICA_ODONTOLOGICA');
  await assert.rejects(
    () => otroBundle.ejecutar({ institucion: 'CLINICA_ODONTOLOGICA', uid: UID }),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'SIN_PERMISO',
  );
  assert.equal(claims, 0);
});

function crearProvision(
  repo: RepositorioCuenta,
  admin: AdministradorIdentidad,
  institucion: BundleInstitucional['institucion'] = 'HOSPITAL_GENERAL',
): ProvisionarCuentaPendiente {
  const bundle: BundleInstitucional = Object.freeze({ institucion, estadoPersistencia: 'DISPONIBLE', cuenta: repo });
  return new ProvisionarCuentaPendiente(admin, (buscada) => buscada === institucion ? bundle : undefined);
}

function crearRepositorio(sobrescritura: Partial<RepositorioCuenta> = {}): RepositorioCuenta {
  return {
    async porUid() { return crearCuenta('PENDIENTE'); },
    async activarPendiente() { return true; },
    ...sobrescritura,
  };
}

function crearCuenta(estado: CuentaAutorizada['estado'], revision = 1, profesionalActivo?: boolean): CuentaAutorizada {
  return Object.freeze({
    id: ID_CUENTA as CuentaAutorizada['id'],
    uid: UID,
    institucion: 'HOSPITAL_GENERAL',
    estado,
    roles: Object.freeze(profesionalActivo === undefined ? ['SECRETARIA'] : ['MEDICO']) as readonly Rol[],
    permisos: Object.freeze([]),
    version: versionPositiva(revision),
    ...(profesionalActivo === undefined ? {} : {
      profesional: Object.freeze({
        id: '20000000-0000-4000-8000-000000000001' as CuentaAutorizada['id'],
        activo: profesionalActivo,
      }),
    }),
  });
}
