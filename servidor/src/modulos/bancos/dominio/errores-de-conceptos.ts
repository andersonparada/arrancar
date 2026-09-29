import { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Los conceptos que el sistema usa por su cuenta no se editan, inactivan ni eliminan. */
export class ConceptoDeSistema extends ReglaDeNegocioInfringida {
  readonly codigo = 'concepto_de_sistema';

  constructor() {
    super('Es un concepto que usa el sistema: no se puede editar, inactivar ni eliminar.');
  }
}

/** Un concepto que ya clasifica notas o cheques no se elimina: se inactiva. */
export class ConceptoEnUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'concepto_en_uso';

  constructor() {
    super('El concepto ya clasifica notas o cheques: no se puede eliminar, pero sí inactivar.');
  }
}
