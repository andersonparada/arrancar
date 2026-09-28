import { DatoInvalido } from '../../compartido/dominio/errores.js';

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
