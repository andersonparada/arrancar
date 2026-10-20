import { RecursoDuplicado, RecursoNoEncontrado } from '../../core/compartido/aplicacion/errores.js';
import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** Un libro con más filas que el tope no se imprime con folios: se divide el período o se pide a soporte. */
export class LibroConDemasiadasFilas extends ReglaDeNegocioInfringida {
  readonly codigo = 'libro_con_demasiadas_filas';

  constructor(filas: number, maximo: number) {
    super(`El libro tiene ${filas} filas y el PDF admite hasta ${maximo}. Use el Excel para este período.`, {
      filas,
      maximo,
    });
  }
}

/** Ya se emitió el libro de este período con los mismos datos: se ofrece la copia, que no gasta folios. */
export class EmisionSinCambios extends RecursoDuplicado {
  override readonly codigo = 'emision_sin_cambios';

  constructor(emisionId: string) {
    super('El libro no ha cambiado desde su última emisión: baje la copia, que no gasta folios.', { emisionId });
  }
}

/** Reemitir un período ya emitido exige explicar por qué. */
export class MotivoDeEmisionObligatorio extends DatoInvalido {
  readonly codigo = 'motivo_de_emision_obligatorio';

  constructor() {
    super('Este período ya se emitió: escriba el motivo de la nueva emisión.', { campo: 'motivo' });
  }
}

/** No se puede poner el último folio por debajo del mayor que Arrancar ya emitió. */
export class FolioMenorQueLoEmitido extends ReglaDeNegocioInfringida {
  readonly codigo = 'folio_menor_que_lo_emitido';

  constructor(emitido: number) {
    super(`Ya se emitieron folios hasta el ${emitido}: el último folio no puede ser menor.`, {
      campo: 'ultimoFolio',
      emitido,
    });
  }
}

export class EmisionNoEncontrada extends RecursoNoEncontrado {
  constructor() {
    super('La emisión');
  }
}
