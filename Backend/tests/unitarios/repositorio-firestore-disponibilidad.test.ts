import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Firestore } from 'firebase-admin/firestore';
import { RepositorioPacientesFirestore } from '../../src/adaptadores/salida/firestore/pacientes/repositorio-pacientes-firestore.js';
import { ErrorDominio } from '../../src/dominio/compartido/error-dominio.js';
import { uuidPublico } from '../../src/dominio/compartido/uuid.js';
import { versionPositiva } from '../../src/dominio/compartido/version.js';

function crearFirestoreQueFalla(): Firestore {
  return {
    doc() {
      return {
        async get() {
          const err = new Error('Firestore stream disconnected');
          Object.assign(err, { code: 14 }); // UNAVAILABLE
          throw err;
        },
      };
    },
    collection() {
      return {
        where() { return this; },
        orderBy() { return this; },
        limit() { return this; },
        async get() {
          const err = new Error('Firestore stream disconnected');
          Object.assign(err, { code: 14 }); // UNAVAILABLE
          throw err;
        },
      };
    },
  } as unknown as Firestore;
}

test('RepositorioPacientesFirestore: traduce fallos operativos a PERSISTENCIA_NO_DISPONIBLE', async () => {
  const firestoreFalla = crearFirestoreQueFalla();
  const repo = new RepositorioPacientesFirestore(firestoreFalla, firestoreFalla);
  const id = uuidPublico('33333333-3333-4333-8333-333333333333');
  const version = versionPositiva(1);

  await assert.rejects(
    async () => repo.porId(id),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );

  await assert.rejects(
    async () => repo.porVersion(id, version),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );

  await assert.rejects(
    async () => repo.titularIdentidad({ tipo: 'CUI', numero: '1234567890101' }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );

  await assert.rejects(
    async () => repo.porIdResponsable(id),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );

  await assert.rejects(
    async () => repo.porPacienteResponsables(id),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );

  await assert.rejects(
    async () => repo.buscar({ q: 'Valentina', orden: 'ASC', limite: 10 }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );

  // Validación de criterios inválidos preserva SOLICITUD_INVALIDA sin traducir a 503
  await assert.rejects(
    async () => repo.buscar({ q: '', orden: 'ASC', limite: 10 }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'SOLICITUD_INVALIDA',
  );

  await assert.rejects(
    async () => repo.buscar({ q: 'Valentina', orden: 'ASC', limite: 200 }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'SOLICITUD_INVALIDA',
  );
});

test('RepositorioPacientesFirestore: un fallo transitorio al leer reservas de identidad no se reporta como "no encontrado"', async () => {
  // Las lecturas de documentos (reservas de identidad) fallan; las consultas por nombre responden vacías.
  const firestoreParcial = {
    doc() {
      return {
        async get() {
          const err = new Error('Firestore stream disconnected');
          Object.assign(err, { code: 14 }); // UNAVAILABLE
          throw err;
        },
      };
    },
    collection() {
      return {
        where() { return this; },
        orderBy() { return this; },
        startAfter() { return this; },
        limit() { return this; },
        async get() {
          return { docs: [] };
        },
      };
    },
  } as unknown as Firestore;
  const repo = new RepositorioPacientesFirestore(firestoreParcial, firestoreParcial);

  await assert.rejects(
    async () => repo.buscar({ q: '2999112230101', orden: 'ASC', limite: 10 }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === 'PERSISTENCIA_NO_DISPONIBLE',
  );
});
