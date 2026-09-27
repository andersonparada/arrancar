export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

/** Error devuelto por la API con el formato `{ error: { codigo, mensaje, detalles } }`. */
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
    readonly detalles?: unknown,
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }

  /** Errores de validación por campo, si la API los envió. */
  get erroresCampos(): ErrorCampo[] {
    return Array.isArray(this.detalles) ? (this.detalles as ErrorCampo[]) : [];
  }
}

type OyenteNoAutenticado = () => void;
let alPerderSesion: OyenteNoAutenticado = () => {};

/** Registra qué hacer cuando la API responde 401 (normalmente, volver al inicio de sesión). */
export function alPerderLaSesion(oyente: OyenteNoAutenticado): void {
  alPerderSesion = oyente;
}

interface OpcionesPeticion {
  consulta?: Record<string, string | number | boolean | undefined | null>;
  cuerpo?: unknown;
}

function construirUrl(ruta: string, consulta?: OpcionesPeticion['consulta']): string {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(consulta ?? {})) {
    if (valor !== undefined && valor !== null && valor !== '') parametros.set(clave, String(valor));
  }
  const texto = parametros.toString();
  return `/api${ruta}${texto ? `?${texto}` : ''}`;
}

async function peticion<T>(metodo: string, ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const esFormulario = opciones.cuerpo instanceof FormData;
  let respuesta: Response;
  try {
    respuesta = await fetch(construirUrl(ruta, opciones.consulta), {
      method: metodo,
      credentials: 'same-origin',
      headers: opciones.cuerpo && !esFormulario ? { 'Content-Type': 'application/json' } : undefined,
      body: esFormulario
        ? (opciones.cuerpo as FormData)
        : opciones.cuerpo
          ? JSON.stringify(opciones.cuerpo)
          : undefined,
    });
  } catch {
    throw new ErrorApi(0, 'sin_conexion', 'No hay conexión con el servidor. Revise su internet.');
  }

  if (respuesta.status === 204) return undefined as T;
  const datos: unknown = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = (datos as { error?: { codigo?: string; mensaje?: string; detalles?: unknown } } | null)?.error;
    if (respuesta.status === 401) alPerderSesion();
    throw new ErrorApi(
      respuesta.status,
      error?.codigo ?? 'error',
      error?.mensaje ?? 'Ocurrió un error inesperado.',
      error?.detalles,
    );
  }
  return datos as T;
}

/** Cliente de la API del servidor. Todas las rutas son relativas a `/api`. */
export const api = {
  obtener: <T>(ruta: string, consulta?: OpcionesPeticion['consulta']) => peticion<T>('GET', ruta, { consulta }),
  crear: <T>(ruta: string, cuerpo?: unknown) => peticion<T>('POST', ruta, { cuerpo }),
  reemplazar: <T>(ruta: string, cuerpo?: unknown) => peticion<T>('PUT', ruta, { cuerpo }),
  modificar: <T>(ruta: string, cuerpo?: unknown) => peticion<T>('PATCH', ruta, { cuerpo }),
  eliminar: <T = void>(ruta: string) => peticion<T>('DELETE', ruta),
};
