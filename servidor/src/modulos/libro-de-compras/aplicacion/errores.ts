import { RecursoDuplicado, RecursoEnUso } from '../../core/compartido/aplicacion/errores.js';

/**
 * El documento ya está registrado en la empresa activa. Trae su id en `detalles.documentoId` para que la pantalla
 * ofrezca abrirlo; si el repetido está en otra empresa o cuenta, la base rechaza con un mensaje que no dice dónde.
 */
export class DocumentoRepetido extends RecursoDuplicado {
  override readonly codigo = 'documento_repetido';

  constructor(documentoId: string) {
    super('Ese documento ya está registrado en esta empresa.', { documentoId });
  }
}

/**
 * Una vigencia fiscal de la empresa la usan documentos vigentes: cambiarla o quitarla les cambiaría el régimen.
 * `detalles.periodo` es el primer período con documentos afectados.
 */
export class VigenciaFiscalEnUso extends RecursoEnUso {
  override readonly codigo = 'vigencia_fiscal_en_uso';

  constructor(periodo: string) {
    super(
      `Hay documentos registrados en ${periodo.slice(0, 7)} con el régimen anterior: escoja un mes posterior o anúlelos.`,
      { campo: 'secciones.libro-de-compras.vigenteDesde', periodo },
    );
  }
}
