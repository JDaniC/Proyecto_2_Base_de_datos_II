const STORAGE_KEY_TOKEN = 'clinica_auth_token_v1';
const STORAGE_KEY_SESSION = 'clinica_auth_session_v1';

let memoriaToken: string | null = null;
let memoriaSession: string | null = null;

function esEntornoNavegador(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export const TokenStorage = {
  guardarToken(token: string): void {
    memoriaToken = token;
    if (esEntornoNavegador()) {
      try {
        window.sessionStorage.setItem(STORAGE_KEY_TOKEN, token);
      } catch {
        // Fallback a memoria si el almacenamiento está restringido
      }
    }
  },

  obtenerToken(): string | null {
    if (memoriaToken) return memoriaToken;
    if (esEntornoNavegador()) {
      try {
        const guardado = window.sessionStorage.getItem(STORAGE_KEY_TOKEN);
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
    if (esEntornoNavegador()) {
      try {
        window.sessionStorage.setItem(STORAGE_KEY_SESSION, json);
      } catch {
        // Fallback a memoria
      }
    }
  },

  obtenerSesionSerializada(): string | null {
    if (memoriaSession) return memoriaSession;
    if (esEntornoNavegador()) {
      try {
        const guardado = window.sessionStorage.getItem(STORAGE_KEY_SESSION);
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
    if (esEntornoNavegador()) {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY_TOKEN);
        window.sessionStorage.removeItem(STORAGE_KEY_SESSION);
      } catch {
        // Ignorar
      }
    }
  },
};
