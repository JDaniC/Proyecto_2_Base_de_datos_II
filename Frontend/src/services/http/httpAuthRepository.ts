import { AuthRepository, IniciarSesionParams } from '../contracts';
import { CuentaDemo, SesionUsuario } from '../types';
import { fromCanonicalInstitutionId } from '../../app/productScope';
import { getDisplayLabel } from '../displayLabels';
import { CierreSesionDto, INSTITUCION_METADATA, SesionDto, TokenProvider } from './types';
import { HttpClient } from './httpClient';
import { TokenStorage } from './tokenStorage';
import { TrialAuthProvider } from './authProvider';

export class HttpAuthRepository implements AuthRepository {
  private readonly httpClient: HttpClient;
  private readonly tokenProvider: TokenProvider;
  private sesionEnMemoria: SesionUsuario | null = null;
  private readonly expiracionListeners = new Set<() => void>();

  constructor(httpClient?: HttpClient, tokenProvider?: TokenProvider) {
    this.tokenProvider = tokenProvider || new TrialAuthProvider();
    this.httpClient = httpClient || new HttpClient({ tokenProvider: this.tokenProvider });

    // Cuando el cliente HTTP detecte 401 (vencimiento/revocación), limpia el estado
    this.tokenProvider.onTokenExpirado = () => {
      this.sesionEnMemoria = null;
      TokenStorage.limpiar();
      for (const listener of this.expiracionListeners) {
        try {
          listener();
        } catch {
          // Ignorar fallos en listeners individuales
        }
      }
    };
  }

  /** Permite a los contextos de React suscribirse al vencimiento o revocación de sesión */
  onExpiracion(callback: () => void): () => void {
    this.expiracionListeners.add(callback);
    return () => {
      this.expiracionListeners.delete(callback);
    };
  }

  /**
   * @deprecated Retirado en modo entrega (DEC11, E01-P2-03).
   * La interfaz institucional se alimenta exclusivamente de la sesión real verificada.
   */
  async obtenerCuentasDemo(): Promise<CuentaDemo[]> {
    return [];
  }

  async iniciarSesion(params: IniciarSesionParams): Promise<SesionUsuario> {
    const { email, password } = params;

    // 1. Obtiene el token del proveedor de identidad
    const token = await this.tokenProvider.establecerCredenciales(email, password);

    // 2. Establece la sesión en el servidor NestJS mediante POST /api/v1/sesion
    // Conforme a OpenAPI, esta operación se autentica por Bearer y no acepta cuerpo
    const res = await this.httpClient.post<SesionDto>('/sesion', undefined, {
      skipAuth: false,
    });

    const dto = res.data;

    // 3. Mapea la institución canónica del servidor ('CENTRO_MEDICO_PEDIATRICO')
    // al alias de presentación de la interfaz ('CENTRO_PEDIATRICO') conforme a DEC06
    const institucionId = fromCanonicalInstitutionId(dto.institucion);
    const metaInst = INSTITUCION_METADATA[institucionId];
    const rolId = dto.roles[0] || 'MEDICO';

    const sesionUsuario: SesionUsuario = {
      cuentaId: dto.cuenta_id,
      email: email.trim().toLowerCase(),
      nombre: dto.profesional?.nombre || email.split('@')[0],
      rolId,
      rolEtiqueta: getDisplayLabel(rolId),
      institucionId,
      institucionNombre: metaInst ? metaInst.nombre : institucionId,
      motorObjetivo: metaInst ? metaInst.motor : 'PostgreSQL',
      permisos: [...dto.permisos],
      fechaInicio: new Date().toISOString(),
      tokenSintetico: token,
    };

    this.sesionEnMemoria = sesionUsuario;
    TokenStorage.guardarSesionSerializada(JSON.stringify(sesionUsuario));

    return sesionUsuario;
  }

  async obtenerSesionActual(): Promise<SesionUsuario | null> {
    const token = await this.tokenProvider.obtenerToken();
    if (!token) {
      this.sesionEnMemoria = null;
      return null;
    }

    try {
      // Consulta al backend para verificar vigencia y recuperar roles/permisos actualizados
      const res = await this.httpClient.get<SesionDto>('/sesion');
      const dto = res.data;

      const institucionId = fromCanonicalInstitutionId(dto.institucion);
      const metaInst = INSTITUCION_METADATA[institucionId];
      const rolId = dto.roles[0] || 'MEDICO';

      // Recuperar el email previamente autenticado si existe en caché
      const cacheada = this.recuperarSesionCacheada();
      const email = cacheada?.email || `${dto.cuenta_id}@institucion.salud.gt`;

      const sesionActualizada: SesionUsuario = {
        cuentaId: dto.cuenta_id,
        email,
        nombre: dto.profesional?.nombre || cacheada?.nombre || email.split('@')[0],
        rolId,
        rolEtiqueta: getDisplayLabel(rolId),
        institucionId,
        institucionNombre: metaInst ? metaInst.nombre : institucionId,
        motorObjetivo: metaInst ? metaInst.motor : 'PostgreSQL',
        permisos: [...dto.permisos],
        fechaInicio: cacheada?.fechaInicio || new Date().toISOString(),
        tokenSintetico: token,
      };

      this.sesionEnMemoria = sesionActualizada;
      TokenStorage.guardarSesionSerializada(JSON.stringify(sesionActualizada));
      return sesionActualizada;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      // 401 o 403: token inválido, vencido o revocado
      if (status === 401 || status === 403) {
        await this.cerrarSesion().catch(() => {});
        return null;
      }

      // Si hay caída de servicio (503), intentamos devolver la sesión en caché local
      // para que la interfaz no pierda el estado de navegación mientras el usuario reintenta
      const cacheada = this.recuperarSesionCacheada();
      if (cacheada) {
        this.sesionEnMemoria = cacheada;
        return cacheada;
      }

      return null;
    }
  }

  async cerrarSesion(): Promise<void> {
    try {
      // Invalida tokens en el servidor (revocación Firebase y cierre institucional)
      await this.httpClient.post<CierreSesionDto>('/sesion/cierre', undefined, {
        skipAuth: false,
      });
    } catch {
      // Continuar con la limpieza local obligatoria aun si el servidor falló
    } finally {
      this.sesionEnMemoria = null;
      await this.tokenProvider.limpiar();
      TokenStorage.limpiar();
    }
  }

  private recuperarSesionCacheada(): SesionUsuario | null {
    if (this.sesionEnMemoria) return this.sesionEnMemoria;
    const json = TokenStorage.obtenerSesionSerializada();
    if (!json) return null;
    try {
      return JSON.parse(json) as SesionUsuario;
    } catch {
      return null;
    }
  }
}
