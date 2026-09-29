import { CargaDemasiadoGrande, DatoInvalido, DemasiadasSolicitudes } from '../../compartido/dominio/errores.js';

export class ArchivoNoLegible extends DatoInvalido {
  readonly codigo = 'archivo_no_legible';

  constructor() {
    super('No se pudo leer el archivo. Suba un Excel (.xlsx), por ejemplo la plantilla.');
  }
}

export class DemasiadasFilas extends DatoInvalido {
  readonly codigo = 'demasiadas_filas';

  constructor(maximo: number) {
    super(`El archivo tiene más de ${maximo.toLocaleString('es-GT')} filas. Divídalo en varios.`);
  }
}

export class ArchivoSinFilas extends DatoInvalido {
  readonly codigo = 'archivo_sin_filas';

  constructor() {
    super('El archivo no tiene filas con datos.');
  }
}

export class ArchivoNoEsExcel extends DatoInvalido {
  readonly codigo = 'archivo_no_es_excel';

  constructor() {
    super('El archivo no es un Excel válido. Suba un Excel (.xlsx), por ejemplo la plantilla.');
  }
}

export class ExcelConContenidoNoPermitido extends DatoInvalido {
  readonly codigo = 'excel_con_contenido_no_permitido';

  constructor() {
    super('El Excel trae macros, vínculos externos u objetos incrustados. Guárdelo como .xlsx sin ellos.');
  }
}

export class ExcelDemasiadoGrandeAlDescomprimir extends CargaDemasiadoGrande {
  readonly codigo = 'excel_demasiado_grande_al_descomprimir';

  constructor() {
    super('El archivo es demasiado grande al descomprimirlo. Divídalo en varios.');
  }
}

export class ArchivoDemasiadoGrande extends CargaDemasiadoGrande {
  readonly codigo = 'archivo_demasiado_grande';

  constructor(maximoEnMb: number) {
    super(`El archivo pesa más de ${maximoEnMb} MB. Divídalo en varios.`);
  }
}

export class DemasiadasImportaciones extends DemasiadasSolicitudes {
  readonly codigo = 'demasiadas_importaciones';

  constructor() {
    super('Hizo demasiadas importaciones en poco tiempo. Espere un minuto e inténtelo de nuevo.');
  }
}
