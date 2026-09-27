import { DatoInvalido } from '../../compartido/dominio/errores.js';

export const FORMATOS_DE_IMAGEN_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

/** Cada imagen se guarda en dos tamaños: el normal para verla y la miniatura para listados. */
export type VarianteDeImagen = 'original' | 'miniatura';

export class FormatoDeImagenNoAceptado extends DatoInvalido {
  readonly codigo = 'formato_de_imagen_no_aceptado';

  constructor() {
    super('Solo se permiten imágenes JPG, PNG, WebP, AVIF o GIF.');
  }
}

export class ImagenIlegible extends DatoInvalido {
  readonly codigo = 'imagen_ilegible';

  constructor() {
    super('La imagen está dañada o no se puede leer.');
  }
}

/** @throws FormatoDeImagenNoAceptado si el tipo no es una imagen que se sepa optimizar. */
export function exigirFormatoAceptado(tipoMime: string): void {
  if (!FORMATOS_DE_IMAGEN_ACEPTADOS.includes(tipoMime)) throw new FormatoDeImagenNoAceptado();
}
