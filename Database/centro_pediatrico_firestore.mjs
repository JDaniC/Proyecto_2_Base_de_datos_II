#!/usr/bin/env node
/**
 * Cloud Firestore de pediatria. Por defecto muestra el plan, sin conexion.
 * node Database/centro_pediatrico_firestore.mjs --plan
 * FIRESTORE_EMULATOR_HOST=127.0.0.1:8188 node Database/centro_pediatrico_firestore.mjs --aplicar --project demo-bdii-pediatria
 * Para remoto: proyecto explicito, base previamente creada y Application Default Credentials.
 * No crea pacientes ni cuentas; no publica reglas/indices ni cambia IAM.
 */
import { readFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { INSTITUCION, VERSION_MODELO, MAX_DOCUMENTO, modelos, validarDocumento, ErrorModelo } from './firebase/modelo_pediatrico.mjs';

export const rolesIniciales = [
  { id: '00000000-0000-4000-8000-000000000001', nombre: 'ADMINISTRADOR_INSTITUCIONAL',
    descripcion: 'Administracion institucional, sin acceso clinico implicito.',
    permisos: ['usuarios.administrar', 'catalogos.administrar', 'historial.archivar', 'auditoria.leer'] },
  { id: '00000000-0000-4000-8000-000000000002', nombre: 'PEDIATRA', descripcion: 'Atencion pediatrica autorizada.',
    permisos: ['historial.leer', 'consultas.registrar', 'diagnosticos.registrar', 'tratamientos.registrar', 'recetas.emitir', 'vacunas.registrar'] },
  { id: '00000000-0000-4000-8000-000000000003', nombre: 'SECRETARIA', descripcion: 'Registro administrativo y agenda.',
    permisos: ['pacientes.administrar', 'citas.administrar', 'responsables.administrar'] },
  { id: '00000000-0000-4000-8000-000000000004', nombre: 'AUDITOR', descripcion: 'Lectura de auditoria autorizada.', permisos: ['auditoria.leer'] },
];

export async function obtenerPlan() {
  const [modelo, reglas, indicesTexto] = await Promise.all([
    readFile(new URL('./firebase/modelo_pediatrico.mjs', import.meta.url)),
    readFile(new URL('./firebase/firestore.rules', import.meta.url)),
    readFile(new URL('./firebase/firestore.indexes.json', import.meta.url), 'utf8'),
  ]);
  const indices = JSON.parse(indicesTexto);
  const huella = createHash('sha256').update(modelo).update(reglas).update(indicesTexto)
    .update(JSON.stringify(rolesIniciales)).digest('hex');
  const rutas = modelos.map((m) => m.ruta);
  return { institucion_id: INSTITUCION, version_esquema: VERSION_MODELO, hash_modelo: huella,
    rutas, colecciones_raiz: [...new Set(rutas.filter((r) => r.split('/').length === 2).map((r) => r.split('/')[0]))],
    indices_compuestos: indices.indexes.length, excepciones_indice: indices.fieldOverrides.length,
    roles: rolesIniciales.map(({ id, nombre }) => ({ id, nombre })),
    limite_documento_bytes: MAX_DOCUMENTO, limite_lista: 100 };
}

export function validarDestino(projectId, databaseId = '(default)', emulatorHost = process.env.FIRESTORE_EMULATOR_HOST) {
  if (typeof projectId !== 'string' || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) throw new ErrorModelo('PROYECTO_EXPLICITO_REQUERIDO');
  if (databaseId !== '(default)' && !/^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(databaseId)) throw new ErrorModelo('BASE_INVALIDA');
  if (emulatorHost && !/^(127\.0\.0\.1|localhost):[1-9][0-9]{0,4}$/.test(emulatorHost)) throw new ErrorModelo('EMULADOR_LOCAL_REQUERIDO');
  if (projectId.startsWith('demo-') && !emulatorHost) throw new ErrorModelo('PROYECTO_DEMO_REQUIERE_EMULADOR');
  if (emulatorHost && !projectId.startsWith('demo-')) throw new ErrorModelo('EMULADOR_REQUIERE_PROYECTO_DEMO');
  return { projectId, databaseId, emulatorHost };
}

export function conectarFirestore(projectId, databaseId = '(default)') {
  const destino = validarDestino(projectId, databaseId);
  const app = initializeApp({ projectId, ...(destino.emulatorHost ? {} : { credential: applicationDefault() }) }, `pediatria-${randomUUID()}`);
  const firestore = getFirestore(app, databaseId);
  return { firestore, cerrar: async () => { await firestore.terminate(); await deleteApp(app); } };
}

export async function inicializarFirestore(firestore, ahora = new Date()) {
  const plan = await obtenerPlan();
  const metadatos = validarDocumento('configuracion/modelo', { revision: 1, version_esquema: VERSION_MODELO,
    institucion_id: INSTITUCION, hash_modelo: plan.hash_modelo, rutas: plan.rutas,
    limite_documento_bytes: MAX_DOCUMENTO, limite_lista: 100, fecha_creacion: ahora });
  const referencias = [firestore.doc('configuracion/modelo'), ...rolesIniciales.map((r) => firestore.doc(`roles/${r.id}`))];
  const colecciones = await firestore.listCollections();
  // Sin manifiesto no se atribuye el modelo a datos preexistentes de otro sistema.
  const tieneModelo = (await referencias[0].get()).exists;
  if (!tieneModelo && colecciones.length) throw new ErrorModelo('BASE_EXISTENTE_SIN_MODELO');

  return firestore.runTransaction(async (tx) => {
    const documentos = await tx.getAll(...referencias); // Todas las lecturas antes de escribir.
    if (documentos[0].exists) {
      const vigente = validarDocumento('configuracion/modelo', documentos[0].data());
      if (vigente.hash_modelo !== plan.hash_modelo || vigente.version_esquema !== VERSION_MODELO
          || JSON.stringify([...vigente.rutas].sort()) !== JSON.stringify([...plan.rutas].sort())) {
        throw new ErrorModelo('MODELO_INCOMPATIBLE_REQUIERE_MIGRACION');
      }
    }
    const pendientes = [];
    for (let i = 0; i < rolesIniciales.length; i += 1) {
      const rol = rolesIniciales[i];
      if (documentos[i + 1].exists) {
        const existente = validarDocumento(`roles/${rol.id}`, documentos[i + 1].data());
        if (existente.nombre !== rol.nombre) throw new ErrorModelo('ROL_INCOMPATIBLE');
        // Permisos administrados posteriormente se preservan; no se restablecen privilegios.
      } else {
        const { id, ...datos } = rol;
        pendientes.push([referencias[i + 1], validarDocumento(`roles/${id}`, { revision: 1, ...datos })]);
      }
    }
    if (!documentos[0].exists) pendientes.unshift([referencias[0], metadatos]);
    for (const [ref, valor] of pendientes) tx.create(ref, valor);
    return { documentos_creados: pendientes.length, roles_iniciales: rolesIniciales.length,
      rutas_definidas: plan.rutas.length, indices_compuestos: plan.indices_compuestos };
  });
}

export async function main(argumentos = process.argv.slice(2)) {
  const { values } = parseArgs({ args: argumentos, options: {
    plan: { type: 'boolean' }, aplicar: { type: 'boolean' }, project: { type: 'string' }, database: { type: 'string', default: '(default)' },
  } });
  if (values.plan && values.aplicar) throw new ErrorModelo('MODOS_INCOMPATIBLES');
  if (!values.aplicar) {
    console.log(JSON.stringify({ modo: 'PLAN_SIN_CONEXION', ...await obtenerPlan() }, null, 2));
    return;
  }
  const conexion = conectarFirestore(values.project, values.database);
  try {
    const resultado = await inicializarFirestore(conexion.firestore);
    console.log(JSON.stringify({ modo: 'INICIALIZADO', proyecto: values.project, base: values.database, ...resultado }));
    console.log('Reglas e indices se publican por separado; no se crearon pacientes ni cuentas Firebase.');
  } finally { await conexion.cerrar(); }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    // No imprimir cargas clinicas, credenciales ni respuestas completas del proveedor.
    console.error(error instanceof ErrorModelo ? error.codigo : `FIRESTORE_ERROR_${error.code || error.name || 'DESCONOCIDO'}`);
    process.exitCode = 1;
  });
}
