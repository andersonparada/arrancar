import { DatoInvalido } from '../../compartido/dominio/errores.js';

export class ExcelAntiguoNoAdmitido extends DatoInvalido {
  readonly codigo = 'excel_antiguo_no_admitido';

  constructor() {
    super('El archivo es un Excel antiguo (.xls). Ábralo en Excel y guárdelo como .xlsx.');
  }
}

/** HTML, XML u otro marcado que no son filas: algunos portales lo entregan con extensión .xls. */
export class ArchivoDeTextoNoAdmitido extends DatoInvalido {
  readonly codigo = 'archivo_de_texto_no_admitido';

  constructor() {
    super('El archivo no es un Excel ni un CSV. Ábralo en Excel y guárdelo como .xlsx.');
  }
}

export class EncabezadosNoEncontrados extends DatoInvalido {
  readonly codigo = 'encabezados_no_encontrados';

  constructor(esperados: readonly string[]) {
    super('No se encontró la fila de encabezados en las primeras filas del archivo.', { esperados });
  }
}

export class ArchivoConCeldasDemasiadoGrandes extends DatoInvalido {
  readonly codigo = 'archivo_con_celdas_demasiado_grandes';

  constructor(motivo: string) {
    super(`El archivo no se puede leer: ${motivo}.`);
  }
}
