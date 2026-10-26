import { randomUUID } from 'node:crypto';
import { applicationDefault, deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { ConfiguracionFirestore } from '../../../configuracion/conexiones-firestore.js';
import type { ClienteFirestore } from './tipos-firestore.js';

export function crearClienteFirestore(config: ConfiguracionFirestore): ClienteFirestore {
  const hostEmuladorOriginal = process.env.FIRESTORE_EMULATOR_HOST;
  if (config.emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = config.emulatorHost;
  }
  let app: App | undefined;
  try {
    app = initializeApp(
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
        try {
          await firestore.terminate();
          await deleteApp(app!);
        } finally {
          restaurarHostEmulador(config.emulatorHost, hostEmuladorOriginal);
        }
      },
    });
  } catch (error: unknown) {
    if (app) void deleteApp(app).catch(() => undefined);
    restaurarHostEmulador(config.emulatorHost, hostEmuladorOriginal);
    throw error;
  }
}

function restaurarHostEmulador(hostConfigurado?: string, hostOriginal?: string): void {
  if (!hostConfigurado || process.env.FIRESTORE_EMULATOR_HOST !== hostConfigurado) return;
  if (hostOriginal === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
  else process.env.FIRESTORE_EMULATOR_HOST = hostOriginal;
}
