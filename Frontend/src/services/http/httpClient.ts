import { HttpClientConfig, HttpRequestOptions, RespuestaApi, TokenProvider } from './types';
import { crearErrorRed, HttpError, parsearRespuestaError } from './errors';
import { generarIdCorrelacion } from './idempotency';

function combinarSenales(senal1?: AbortSignal, senal2?: AbortSignal): AbortSignal | undefined {
  if (!senal1) return senal2;
  if (!senal2) return senal1;
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
    return AbortSignal.any([senal1, senal2]);
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort(senal1.aborted ? senal1.reason : senal2.reason);
  if (senal1.aborted || senal2.aborted) {
    onAbort();
  } else {
    senal1.addEventListener('abort', onAbort, { once: true });
    senal2.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly tokenProvider?: TokenProvider;
  private readonly defaultTimeoutMs: number;

  constructor(config: HttpClientConfig = {}) {
    const envBase = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : undefined;
    this.baseUrl = (config.baseUrl || envBase || '/api/v1').replace(/\/+$/, '');
    this.tokenProvider = config.tokenProvider;
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 15000;
  }

  async get<T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<RespuestaApi<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T>(path: string, body?: unknown, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<RespuestaApi<T>> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  async put<T>(path: string, body?: unknown, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<RespuestaApi<T>> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  async patch<T>(path: string, body?: unknown, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<RespuestaApi<T>> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  async delete<T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<RespuestaApi<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  async request<T>(path: string, options: HttpRequestOptions = {}): Promise<RespuestaApi<T>> {
    const correlacion = options.correlacionId || generarIdCorrelacion();
    const url = this.construirUrl(path, options.query);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Correlation-ID': correlacion,
      ...(options.headers || {}),
    };

    // Autenticación Bearer
    if (!options.skipAuth && this.tokenProvider) {
      const token = await this.tokenProvider.obtenerToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    // Cabecera Idempotency-Key para mutaciones y comandos compuestos (DEC08)
    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    let requestBody: string | undefined = undefined;
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      // Omisión/filtrado de campos de autoridad del cliente (DEC07)
      requestBody = JSON.stringify(this.sanitizarCuerpo(options.body));
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => {
      abortController.abort(new Error(`Timeout tras ${options.timeoutMs ?? this.defaultTimeoutMs} ms`));
    }, options.timeoutMs ?? this.defaultTimeoutMs);

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: requestBody,
        signal: combinarSenales(options.signal, abortController.signal),
      });

      const correlationHeader = response.headers.get('X-Correlation-ID') || correlacion;

      if (!response.ok) {
        if (response.status === 401) {
          this.tokenProvider?.onTokenExpirado?.();
        }

        let payloadError: unknown = null;
        try {
          payloadError = await response.json();
        } catch (jsonErr: unknown) {
          if (
            abortController.signal.aborted ||
            options.signal?.aborted ||
            (jsonErr instanceof Error && jsonErr.name === 'AbortError')
          ) {
            throw jsonErr;
          }
        }
        throw parsearRespuestaError(response.status, payloadError, correlationHeader);
      }

      // 204 No Content
      if (response.status === 204) {
        return {
          data: undefined as unknown as T,
          meta: { correlacion: correlationHeader },
        };
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (jsonErr: unknown) {
        if (
          abortController.signal.aborted ||
          options.signal?.aborted ||
          (jsonErr instanceof Error && jsonErr.name === 'AbortError')
        ) {
          throw jsonErr;
        }
        const contentLength = response.headers.get('Content-Length');
        if (contentLength === '0') {
          payload = undefined;
        } else {
          throw jsonErr;
        }
      }
      if (typeof payload === 'object' && payload !== null && 'data' in payload) {
        const respuesta = payload as RespuestaApi<T>;
        return {
          data: respuesta.data,
          meta: respuesta.meta || { correlacion: correlationHeader },
        };
      }

      return {
        data: payload as T,
        meta: { correlacion: correlationHeader },
      };
    } catch (err: unknown) {
      if (err instanceof HttpError) {
        throw err;
      }
      throw crearErrorRed(err, correlacion);
    } finally {
      clearTimeout(timeout);
    }
  }

  private construirUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const normalizado = path.startsWith('/') ? path : `/${path}`;
    const baseCompleta = `${this.baseUrl}${normalizado}`;

    if (!query) return baseCompleta;

    const params = new URLSearchParams();
    for (const [clave, valor] of Object.entries(query)) {
      if (valor !== undefined && valor !== null && valor !== '') {
        // Filtrar campos de autoridad en query (DEC07)
        if (['profesional', 'actor', 'autor', 'institucionId', 'rol'].includes(clave)) {
          continue;
        }
        params.append(clave, String(valor));
      }
    }

    const qs = params.toString();
    return qs ? `${baseCompleta}?${qs}` : baseCompleta;
  }

  /**
   * Elimina campos de autoridad enviados accidentalmente desde la UI (DEC07).
   * El backend deriva actor, permisos e institución exclusivamente de la sesión verificada.
   */
  private sanitizarCuerpo(body: unknown): unknown {
    if (typeof body !== 'object' || body === null) return body;
    if (Array.isArray(body)) return body.map((item) => this.sanitizarCuerpo(item));

    const obj = body as Record<string, unknown>;
    const copia: Record<string, unknown> = {};

    for (const [clave, valor] of Object.entries(obj)) {
      if (['actor', 'institucionId', 'institucion_id', 'autor', 'rolEmisor'].includes(clave)) {
        continue;
      }
      copia[clave] = typeof valor === 'object' && valor !== null ? this.sanitizarCuerpo(valor) : valor;
    }
    return copia;
  }
}
