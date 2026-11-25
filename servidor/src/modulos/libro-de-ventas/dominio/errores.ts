import { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** El concepto de ingreso tiene líneas de documentos: se inactiva en vez de eliminarse. */
export class ConceptoDeIngresoEnUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'concepto_de_ingreso_en_uso';

  constructor() {
    super('El concepto de ingreso tiene documentos. Inactívelo en vez de eliminarlo.');
  }
}
