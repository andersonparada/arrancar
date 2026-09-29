import { CargaDemasiadoGrande, DatoInvalido, DemasiadasSolicitudes } from '../../compartido/dominio/errores.js';
import { LIMITE_DE_PIXELES } from '../../compartido/dominio/limites-de-imagen.js';

/** Formatos reales (no el que dice el cliente) que se saben optimizar. */
const FORMATOS_DE_FOTO_ACEPTADOS = ['jpeg', 'png', 'webp'];

/** Marcas de la cabecera `ftyp` de los archivos HEIC/HEIF de las cámaras de iPhone. */
const MARCAS_HEIC = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis'];

/** Cada imagen se guarda en dos tamaños: el normal para verla y la miniatura para listados. */
export type VarianteDeImagen = 'original' | 'miniatura';

export class FormatoDeImagenNoAceptado extends DatoInvalido {
  readonly codigo = 'formato_de_imagen_no_aceptado';

  constructor() {
    super('Solo se permiten fotos JPG, PNG o WebP.');
  }
}

export class FotoHeicNoAceptada extends DatoInvalido {
  readonly codigo = 'foto_heic_no_aceptada';

  constructor() {
    super('Convierte la foto a JPEG: en el iPhone, Ajustes > Cámara > Formatos > Más compatible, y vuelve a tomarla.');
  }
}

export class ImagenDemasiadoGrande extends CargaDemasiadoGrande {
  readonly codigo = 'imagen_demasiado_grande';

  constructor() {
    super('La imagen tiene demasiados píxeles (máximo 100 megapíxeles). Redúcela e inténtalo de nuevo.');
  }
}

export class ImagenIlegible extends DatoInvalido {
  readonly codigo = 'imagen_ilegible';

  constructor() {
    super('La imagen está dañada o no se puede leer.');
  }
}

export class DemasiadasSubidas extends DemasiadasSolicitudes {
  readonly codigo = 'demasiadas_subidas';

  constructor() {
    super('Subiste demasiados archivos en poco tiempo. Espera un minuto e inténtalo de nuevo.');
  }
}

/** Una foto de iPhone en HEIC se reconoce por la marca de su cabecera, sin decodificarla. */
export function esHeicPorCabecera(contenido: Buffer): boolean {
  if (contenido.length < 12 || contenido.toString('latin1', 4, 8) !== 'ftyp') return false;
  return MARCAS_HEIC.includes(contenido.toString('latin1', 8, 12));
}

/**
 * Revisa el formato real que detectó el decodificador. AVIF también se llama `heif`
 * pero comprime con `av1`; solo `hevc` es HEIC.
 * @throws FotoHeicNoAceptada si es HEIC.
 * @throws FormatoDeImagenNoAceptado si no es JPEG, PNG ni WebP.
 */
export function exigirFormatoDeFoto(formato: string | undefined, compresion?: string): void {
  if (formato === 'heif' && compresion === 'hevc') throw new FotoHeicNoAceptada();
  if (!formato || !FORMATOS_DE_FOTO_ACEPTADOS.includes(formato)) throw new FormatoDeImagenNoAceptado();
}

/** @throws ImagenDemasiadoGrande si ancho por alto pasa de 100 megapíxeles. */
export function exigirTamanoDeFoto(ancho: number, alto: number): void {
  if (ancho * alto > LIMITE_DE_PIXELES) throw new ImagenDemasiadoGrande();
}
