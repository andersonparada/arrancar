export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

/** Error devuelto por la API con el formato `{ error: { codigo, mensaje, detalles } }`. */
export class ErrorApi extends Error {
  readonly codigo: string;
  readonly detalles: unknown;

  constructor(
    readonly estado: number,
    { codigo, mensaje, detalles }: { codigo: string; mensaje: string; detalles?: unknown },
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.codigo = codigo;
    this.detalles = detalles;
  }

  /** Errores de validación por campo, si la API los envió. */
  get erroresCampos(): ErrorCampo[] {
    return Array.isArray(this.detalles) ? (this.detalles as ErrorCampo[]) : [];
  }
}

export type Consulta = Record<string, string | number | boolean | undefined | null>;

interface Peticion {
  metodo: string;
  ruta: string;
  consulta?: Consulta;
  cuerpo?: unknown;
}

interface CuerpoDeError {
  error?: { codigo?: string; mensaje?: string; detalles?: unknown };
}

/** Habla con la API del servidor; todas las rutas son relativas a `/api`. */
export class ClienteHttp {
  private alPerderSesion: () => void = () => {};

  constructor(private readonly base = '/api') {}

  /** Qué hacer cuando la API responde 401 (normalmente, volver al inicio de sesión). */
  alPerderLaSesion(oyente: () => void): void {
    this.alPerderSesion = oyente;
  }

  obtener<T>(ruta: string, consulta?: Consulta): Promise<T> {
    return this.enviar<T>({ metodo: 'GET', ruta, consulta });
  }

  crear<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    return this.enviar<T>({ metodo: 'POST', ruta, cuerpo });
  }

  reemplazar<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    return this.enviar<T>({ metodo: 'PUT', ruta, cuerpo });
  }

  modificar<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    return this.enviar<T>({ metodo: 'PATCH', ruta, cuerpo });
  }

  eliminar<T = void>(ruta: string): Promise<T> {
    return this.enviar<T>({ metodo: 'DELETE', ruta });
  }

  private async enviar<T>(peticion: Peticion): Promise<T> {
    const respuesta = await this.llamar(peticion);
    if (respuesta.status === 204) return undefined as T;
    const datos: unknown = await respuesta.json().catch(() => null);
    if (!respuesta.ok) throw this.errorDe(respuesta.status, datos as CuerpoDeError | null);
    return datos as T;
  }

  private async llamar({ metodo, ruta, consulta, cuerpo }: Peticion): Promise<Response> {
    const esFormulario = cuerpo instanceof FormData;
    try {
      return await fetch(this.url(ruta, consulta), {
        method: metodo,
        credentials: 'same-origin',
        headers: cuerpo && !esFormulario ? { 'Content-Type': 'application/json' } : undefined,
        body: esFormulario ? cuerpo : cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
    } catch {
      throw new ErrorApi(0, {
        codigo: 'sin_conexion',
        mensaje: 'No hay conexión con el servidor. Revise su internet.',
      });
    }
  }

  private errorDe(estado: number, datos: CuerpoDeError | null): ErrorApi {
    if (estado === 401) this.alPerderSesion();
    const error = datos?.error;
    return new ErrorApi(estado, {
      codigo: error?.codigo ?? 'error',
      mensaje: error?.mensaje ?? 'Ocurrió un error inesperado.',
      detalles: error?.detalles,
    });
  }

  private url(ruta: string, consulta: Consulta = {}): string {
    const parametros = new URLSearchParams();
    for (const [clave, valor] of Object.entries(consulta)) {
      if (valor !== undefined && valor !== null && valor !== '') parametros.set(clave, String(valor));
    }
    const texto = parametros.toString();
    return `${this.base}${ruta}${texto ? `?${texto}` : ''}`;
  }
}

export const clienteHttp = new ClienteHttp();
