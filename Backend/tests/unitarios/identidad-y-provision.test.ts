import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Auth } from 'firebase-admin/auth';
import { AdministradorCuentasFirebase } from '../../src/adaptadores/salida/identidad/administrador-cuentas-firebase.js';
import { VerificadorIdentidadFirebase } from '../../src/adaptadores/salida/identidad/verificador-identidad-firebase.js';
import { crearDependenciasBackend, ErrorConfiguracionBackend } from '../../src/composicion/crear-dependencias-backend.js';
import { ProvisionarCuentaPendiente } from '../../src/aplicacion/casos-uso/cuentas/provisionar-cuenta-pendiente.js';
import type { AdministradorIdentidad } from '../../src/aplicacion/puertos/administrador-identidad.js';
import type { CuentaAutorizada } from '../../src/aplicacion/puertos/contexto-autenticado.js';
import type { RepositorioCuenta } from '../../src/aplicacion/puertos/repositorio-cuenta.js';
import type { BloqueoProvision } from '../../src/aplicacion/puertos/bloqueo-provision.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { INSTITUCIONES_CANONICAS, type Institucion } from '../../src/dominio/compartido/institucion.js';
import type { Rol } from '../../src/dominio/compartido/autorizacion.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';
import type { PoolSql } from '../../src/adaptadores/salida/sql/tipos-sql.js';
import { crearRepositorioCuentaInstitucionalPostgresql } from '../../src/adaptadores/salida/identidad/repositorios-cuenta-sql.js';
import { BloqueoProvisionPostgresql } from '../../src/adaptadores/salida/identidad/bloqueo-provision-postgresql.js';

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

test('la composición rechaza Auth Emulator contra un proyecto Firestore real antes de conectar motores', async () => {
  await assert.rejects(
    () => crearDependenciasBackend({
      APP_ENV: 'delivery',
      POSTGRES_HOST: '127.0.0.1', POSTGRES_PORT: '1', POSTGRES_PASSWORD_FILE: '/tmp/pg-inexistente',
      MYSQL_HOST: '127.0.0.1', MYSQL_PORT: '1', MYSQL_PASSWORD_FILE: '/tmp/mysql-inexistente',
      MONGO_HOST: '127.0.0.1', MONGO_PORT: '1', MONGO_APP_PASSWORD_FILE: '/tmp/mongo-inexistente',
      FIRESTORE_PROJECT_ID: 'bdii-pediatria-real',
      FIREBASE_AUTH_PROJECT_ID: 'bdii-pediatria-real', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
    }),
    (error: unknown) => error instanceof ErrorConfiguracionBackend &&
      error.variables.includes('FIREBASE_AUTH_EMULATOR_HOST') &&
      error.variables.includes('FIRESTORE_PROJECT_ID'),
  );
});

test('un rollback SQL fallido descarta la conexión incierta', async () => {
  let descartada: boolean | undefined;
  const conexion = {
    async consultar() { throw new Error('lectura fallida'); },
    async iniciar() {},
    async confirmar() {},
    async revertir() { throw new Error('rollback fallido'); },
    liberar(descartar = false) { descartada = descartar; },
  };
  const pool = { adquirir: async () => conexion } as unknown as PoolSql;

  await assert.rejects(() => crearRepositorioCuentaInstitucionalPostgresql(pool).porUid(UID));
  assert.equal(descartada, true);
});

test('un acuse incierto del advisory lock descarta la sesión PostgreSQL', async () => {
  let descartada: boolean | undefined;
  const conexion = {
    async consultar() { throw new Error('acuse perdido'); },
    async iniciar() {},
    async confirmar() {},
    async revertir() {},
    liberar(descartar = false) { descartada = descartar; },
  };
  const pool = { adquirir: async () => conexion } as unknown as PoolSql;
  let ejecutoTrabajo = false;

  await assert.rejects(
    () => new BloqueoProvisionPostgresql(pool).ejecutar(UID, async () => { ejecutoTrabajo = true; }),
  );
  assert.equal(ejecutoTrabajo, false);
  assert.equal(descartada, true);
});

test('si falla la confirmación de desbloqueo, descarta la sesión y conserva el resultado', async () => {
  let consultas = 0;
  let descartada: boolean | undefined;
  const conexion = {
    async consultar() {
      consultas += 1;
      if (consultas === 2) throw new Error('acuse de desbloqueo perdido');
      return { filas: [] };
    },
    async iniciar() {},
    async confirmar() {},
    async revertir() {},
    liberar(descartar = false) { descartada = descartar; },
  };
  const pool = { adquirir: async () => conexion } as unknown as PoolSql;
  const resultado = await new BloqueoProvisionPostgresql(pool).ejecutar(UID, async () => 'completada');

  assert.equal(resultado, 'completada');
  assert.equal(descartada, true);
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

test('la provisión rechaza un UID ligado a dos instituciones sin alterar Firebase ni las cuentas', async () => {
  let claims = 0;
  let activaciones = 0;
  const hospital = crearRepositorio({ porUid: async () => crearCuenta('PENDIENTE', 1, undefined, 'HOSPITAL_GENERAL') });
  const odontologia = crearRepositorio({
    porUid: async () => crearCuenta('PENDIENTE', 1, undefined, 'CLINICA_ODONTOLOGICA'),
    activarPendiente: async () => { activaciones += 1; return true; },
  });
  const admin: AdministradorIdentidad = { async asegurarClaimInstitucion() { claims += 1; } };
  const provisionar = crearProvision(hospital, admin, 'HOSPITAL_GENERAL', {
    HOSPITAL_GENERAL: hospital,
    CLINICA_ODONTOLOGICA: odontologia,
  });

  await assert.rejects(
    () => provisionar.ejecutar({ institucion: 'HOSPITAL_GENERAL', uid: UID }),
    (error: unknown) => error instanceof ErrorDominio && error.codigo === 'SIN_PERMISO',
  );
  assert.equal(claims, 0);
  assert.equal(activaciones, 0);
});

function crearProvision(
  repo: RepositorioCuenta,
  admin: AdministradorIdentidad,
  institucion: Institucion = 'HOSPITAL_GENERAL',
  repositorios: Partial<Record<Institucion, RepositorioCuenta>> = {},
): ProvisionarCuentaPendiente {
  const bundles = Object.freeze(INSTITUCIONES_CANONICAS.map((inst) => Object.freeze({
    institucion: inst,
    estadoPersistencia: 'DISPONIBLE' as const,
    cuenta: repositorios[inst] ?? (inst === institucion ? repo : crearRepositorio({ porUid: async () => null })),
  })));
  const colas = new Map<string, Promise<void>>();
  const bloqueo: BloqueoProvision = {
    async ejecutar<T>(uid: string, trabajo: () => Promise<T>): Promise<T> {
      const anterior = colas.get(uid) ?? Promise.resolve();
      let liberar!: () => void;
      const turno = new Promise<void>((resolve) => { liberar = resolve; });
      const cola = anterior.then(() => turno);
      colas.set(uid, cola);
      await anterior;
      try {
        return await trabajo();
      } finally {
        liberar();
        if (colas.get(uid) === cola) colas.delete(uid);
      }
    },
  };
  return new ProvisionarCuentaPendiente(admin, () => bundles, bloqueo);
}

function crearRepositorio(sobrescritura: Partial<RepositorioCuenta> = {}): RepositorioCuenta {
  return {
    async porUid() { return crearCuenta('PENDIENTE'); },
    async activarPendiente() { return true; },
    ...sobrescritura,
  };
}

function crearCuenta(
  estado: CuentaAutorizada['estado'],
  revision = 1,
  profesionalActivo?: boolean,
  institucion: Institucion = 'HOSPITAL_GENERAL',
): CuentaAutorizada {
  return Object.freeze({
    id: ID_CUENTA as CuentaAutorizada['id'],
    uid: UID,
    institucion,
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
