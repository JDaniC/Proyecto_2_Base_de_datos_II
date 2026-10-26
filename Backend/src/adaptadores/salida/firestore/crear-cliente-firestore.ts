import { randomUUID } from 'node:crypto';
import { applicationDefault, deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { ConfiguracionFirestore } from '../../../configuracion/conexiones-firestore.js';
import type { ClienteFirestore } from './tipos-firestore.js';

export function crearClienteFirestore(config: ConfiguracionFirestore): ClienteFirestore {
  if (config.emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = config.emulatorHost;
  }
  const app: App = initializeApp(
    {
      projectId: config.projectId,
      ...(config.emulatorHost ? {} : { credential: applicationDefault() }),
    },
    `pediatria-uow-${randomUUID()}`,
  );
  const firestore: Firestore = getFirestore(app, config.databaseId);

  return Object.freeze({
    firestore,
    projectId: config.projectId,
    databaseId: config.databaseId,
    cerrar: async () => {
      await firestore.terminate();
      await deleteApp(app);
    },
  });
}
