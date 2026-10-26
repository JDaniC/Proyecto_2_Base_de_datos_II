export interface ConfiguracionFirestore {
  readonly projectId: string;
  readonly databaseId: string;
  readonly emulatorHost?: string;
  readonly institucionalId: 'CENTRO_MEDICO_PEDIATRICO';
}

export class ErrorConfiguracionFirestore extends Error {
  constructor(readonly variables: readonly string[]) {
    super('INVALID_FIRESTORE_RUNTIME_CONFIGURATION');
    this.name = 'ErrorConfiguracionFirestore';
    Object.freeze(this.variables);
  }
}

export function parsearConfiguracionFirestore(
  variables: Readonly<Record<string, string | undefined>>,
): ConfiguracionFirestore {
  const projectId = (variables.FIRESTORE_PROJECT_ID ?? variables.GCP_PROJECT ?? variables.GOOGLE_CLOUD_PROJECT)?.trim();
  const databaseId = variables.FIRESTORE_DATABASE_ID?.trim() ?? '(default)';
  const emulatorHost = variables.FIRESTORE_EMULATOR_HOST?.trim();

  const errores: string[] = [];

  if (!projectId || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) {
    errores.push('FIRESTORE_PROJECT_ID');
  }

  if (databaseId !== '(default)' && !/^[a-z][a-z0-9-]{2,61}[a-z0-9]$/.test(databaseId)) {
    errores.push('FIRESTORE_DATABASE_ID');
  }

  if (emulatorHost && !hostEmuladorLocalValido(emulatorHost)) {
    errores.push('FIRESTORE_EMULATOR_HOST');
  }

  if (projectId?.startsWith('demo-') && !emulatorHost) {
    errores.push('FIRESTORE_EMULATOR_HOST');
  }

  if (emulatorHost && projectId && !projectId.startsWith('demo-')) {
    errores.push('FIRESTORE_PROJECT_ID');
  }

  if (variables.FIRESTORE_INSTITUCION !== undefined && variables.FIRESTORE_INSTITUCION !== 'CENTRO_MEDICO_PEDIATRICO') {
    errores.push('FIRESTORE_INSTITUCION');
  }

  if (errores.length > 0) throw new ErrorConfiguracionFirestore(errores);

  return Object.freeze({
    projectId: projectId as string,
    databaseId,
    ...(emulatorHost ? { emulatorHost } : {}),
    institucionalId: 'CENTRO_MEDICO_PEDIATRICO',
  });
}

function hostEmuladorLocalValido(host: string): boolean {
  const coincidencia = /^(127\.0\.0\.1|localhost):([0-9]{1,5})$/.exec(host);
  if (!coincidencia) return false;
  const puerto = Number(coincidencia[2]);
  return Number.isInteger(puerto) && puerto >= 1 && puerto <= 65_535;
}
