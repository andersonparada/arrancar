import { CargaDemasiadoGrande, DatoInvalido } from '../../compartido/dominio/errores.js';

/** Constantes de seguridad, no configurables. */
export const LIMITE_DE_BYTES_DE_PDF = 10 * 1024 * 1024;
export const LIMITE_DE_BYTES_DE_FOTO_DE_DOCUMENTO = 15 * 1024 * 1024;
export const LIMITE_DE_PAGINAS_DE_PDF = 300;

/** Firma con la que empieza todo PDF (debe estar en el byte 0). */
const FIRMA_DE_PDF = '%PDF-';

/** Un PDF se reconoce por su firma en el primer byte, no por el nombre ni por el tipo que diga el cliente. */
export function esPdfPorFirma(contenido: Buffer): boolean {
  return contenido.toString('latin1', 0, FIRMA_DE_PDF.length) === FIRMA_DE_PDF;
}

export class DocumentoNoAceptado extends DatoInvalido {
  readonly codigo = 'documento_no_aceptado';

  constructor() {
    super('Solo se aceptan documentos PDF o fotos JPG, PNG o WebP.');
  }
}

export class DocumentoDemasiadoGrande extends CargaDemasiadoGrande {
  readonly codigo = 'documento_demasiado_grande';

  constructor(limiteEnMegabytes: number) {
    super(`El archivo pesa demasiado (máximo ${limiteEnMegabytes} MB).`);
  }
}

export class PdfConContrasena extends DatoInvalido {
  readonly codigo = 'pdf_con_contrasena';

  constructor() {
    super(
      'El PDF está protegido con contraseña y no se puede revisar. Ábralo y use Imprimir > Guardar como PDF ' +
        'para obtener una copia sin contraseña.',
    );
  }
}

export class PdfDanado extends DatoInvalido {
  readonly codigo = 'pdf_danado';

  constructor() {
    super('El PDF está dañado o incompleto. Descárguelo de nuevo o guárdelo otra vez desde el programa que lo creó.');
  }
}

export class PdfConDemasiadasPaginas extends DatoInvalido {
  readonly codigo = 'pdf_con_demasiadas_paginas';

  constructor(paginas: number) {
    super(`El PDF tiene ${paginas} páginas y el máximo es ${LIMITE_DE_PAGINAS_DE_PDF}.`);
  }
}

/** El PDF trae programas, archivos adjuntos, formularios o enlaces a otros archivos; `detalles` dice cuáles. */
export class PdfConContenidoActivo extends DatoInvalido {
  readonly codigo = 'pdf_con_contenido_activo';

  constructor(hallazgos: string[]) {
    super(
      `El PDF trae contenido activo (${hallazgos.join(', ')}) y no se acepta. ` +
        'Ábralo y use Imprimir > Guardar como PDF para obtener una copia limpia.',
      hallazgos,
    );
  }
}

/** La revisión tardó demasiado o gastó demasiada memoria: se trata como un PDF que no se pudo revisar. */
export class PdfNoSePudoRevisar extends DatoInvalido {
  readonly codigo = 'pdf_no_se_pudo_revisar';

  constructor() {
    super(
      'No se pudo revisar el PDF: es demasiado complejo o pesado. Guárdelo de nuevo con Imprimir > Guardar como PDF.',
    );
  }
}
