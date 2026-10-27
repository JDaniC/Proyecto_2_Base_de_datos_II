const STORAGE_KEY_TOKEN = 'clinica_auth_token_v1';
const STORAGE_KEY_SESSION = 'clinica_auth_session_v1';

let memoriaToken: string | null = null;
let memoriaSession: string | null = null;

function obtenerStorageSeguro(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
  } catch {
    // Si las políticas de seguridad del navegador restringen el acceso a storage (SecurityError),
    // se devuelve null de forma controlada para activar el almacenamiento en memoria.
  }
  return null;
}

export const TokenStorage = {
  guardarToken(token: string): void {
    memoriaToken = token;
    const storage = obtenerStorageSeguro();
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY_TOKEN, token);
      } catch {
        // Fallback a memoria si el almacenamiento está restringido
      }
    }
  },

  obtenerToken(): string | null {
    if (memoriaToken) return memoriaToken;
    const storage = obtenerStorageSeguro();
    if (storage) {
      try {
        const guardado = storage.getItem(STORAGE_KEY_TOKEN);
        if (guardado) {
          memoriaToken = guardado;
          return guardado;
        }
      } catch {
        return null;
      }
    }
    return null;
  },

  guardarSesionSerializada(json: string): void {
    memoriaSession = json;
    const storage = obtenerStorageSeguro();
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY_SESSION, json);
      } catch {
        // Fallback a memoria
      }
    }
  },

  obtenerSesionSerializada(): string | null {
    if (memoriaSession) return memoriaSession;
    const storage = obtenerStorageSeguro();
    if (storage) {
      try {
        const guardado = storage.getItem(STORAGE_KEY_SESSION);
        if (guardado) {
          memoriaSession = guardado;
          return guardado;
        }
      } catch {
        return null;
      }
    }
    return null;
  },

  limpiar(): void {
    memoriaToken = null;
    memoriaSession = null;
    const storage = obtenerStorageSeguro();
    if (storage) {
      try {
        storage.removeItem(STORAGE_KEY_TOKEN);
        storage.removeItem(STORAGE_KEY_SESSION);
      } catch {
        // Ignorar
      }
    }
  },
};
