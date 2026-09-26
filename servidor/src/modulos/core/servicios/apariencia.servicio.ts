import type { Readable } from 'node:stream';
import sharp from 'sharp';
import { almacenamiento } from '../almacenamiento/almacenamiento.js';
import { ErrorNoEncontrado, ErrorSolicitudInvalida } from '../errores/errores.js';
import type { AparienciaSolicitada } from '../validaciones/apariencia.validaciones.js';
import { TIPOS_IMAGEN_PERMITIDOS, type ImagenSubida } from './archivos.servicio.js';
import { configuracionServicio, DESTINO_INSTALACION } from './configuracion.servicio.js';

export const CLAVES_APARIENCIA = {
  nombreAplicacion: 'core.interfaz.nombre_aplicacion',
  colorPrincipal: 'core.apariencia.color_principal',
  colorAcento: 'core.apariencia.color_acento',
  versionLogo: 'core.apariencia.version_logo',
} as const;

const RUTA_LOGO = 'instalacion/logo.png';
const LADO_LOGO = 512;
const TIPOS_LOGO = [...TIPOS_IMAGEN_PERMITIDOS, 'image/svg+xml'];

export interface Apariencia {
  nombreAplicacion: string;
  colorPrincipal: string;
  colorAcento: string;
  /** Ruta del logo propio con su versión (para renovar la caché), o `null` si usa el de Arrancar. */
  urlLogo: string | null;
}

/**
 * Identidad visual de la instalación: nombre, colores del menú y encabezados, y
 * logo. Es la misma para todas las cuentas del servidor y la edita soporte.
 */
export const aparienciaServicio = {
  async obtener(): Promise<Apariencia> {
    const valores = await configuracionServicio.valoresPublicos(DESTINO_INSTALACION);
    const versionLogo = valores[CLAVES_APARIENCIA.versionLogo] as string | null;
    return {
      nombreAplicacion: valores[CLAVES_APARIENCIA.nombreAplicacion] as string,
      colorPrincipal: valores[CLAVES_APARIENCIA.colorPrincipal] as string,
      colorAcento: valores[CLAVES_APARIENCIA.colorAcento] as string,
      urlLogo: versionLogo ? `/api/apariencia/logo?v=${versionLogo}` : null,
    };
  },

  async guardar(datos: AparienciaSolicitada, usuarioId: string): Promise<Apariencia> {
    for (const campo of ['nombreAplicacion', 'colorPrincipal', 'colorAcento'] as const) {
      await configuracionServicio.establecer(
        DESTINO_INSTALACION,
        undefined,
        CLAVES_APARIENCIA[campo],
        'instalacion',
        datos[campo],
        usuarioId,
      );
    }
    return this.obtener();
  },

  /** Vuelve a los colores y el nombre de Arrancar (o a los del archivo de instalación). */
  async restablecer(): Promise<Apariencia> {
    for (const campo of ['nombreAplicacion', 'colorPrincipal', 'colorAcento'] as const) {
      await configuracionServicio.restablecer(DESTINO_INSTALACION, undefined, CLAVES_APARIENCIA[campo], 'instalacion');
    }
    return this.obtener();
  },

  /**
   * Guarda el logo como PNG cuadrado de 512 px con fondo transparente.
   * @throws ErrorSolicitudInvalida si el archivo no es una imagen válida.
   */
  async cambiarLogo(imagen: ImagenSubida, usuarioId: string): Promise<Apariencia> {
    if (!TIPOS_LOGO.includes(imagen.tipoMime)) {
      throw new ErrorSolicitudInvalida('El logo debe ser una imagen SVG, PNG, JPG o WebP.');
    }
    let logo: Buffer;
    try {
      logo = await sharp(imagen.contenido, { failOn: 'error', density: 300 })
        .resize({ width: LADO_LOGO, height: LADO_LOGO, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    } catch {
      throw new ErrorSolicitudInvalida('La imagen está dañada o no se puede leer.');
    }
    await almacenamiento.guardar(RUTA_LOGO, logo);
    await configuracionServicio.establecer(
      DESTINO_INSTALACION,
      undefined,
      CLAVES_APARIENCIA.versionLogo,
      'instalacion',
      Date.now().toString(36),
      usuarioId,
    );
    return this.obtener();
  },

  async quitarLogo(): Promise<Apariencia> {
    await almacenamiento.eliminar(RUTA_LOGO);
    await configuracionServicio.restablecer(DESTINO_INSTALACION, undefined, CLAVES_APARIENCIA.versionLogo, 'instalacion');
    return this.obtener();
  },

  /**
   * @throws ErrorNoEncontrado si la instalación no tiene logo propio.
   */
  async abrirLogo(): Promise<Readable> {
    try {
      return await almacenamiento.leer(RUTA_LOGO);
    } catch {
      throw new ErrorNoEncontrado('El logo');
    }
  },
};
