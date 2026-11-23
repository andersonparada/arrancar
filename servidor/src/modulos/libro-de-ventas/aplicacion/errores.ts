import { RecursoDuplicado } from '../../core/compartido/aplicacion/errores.js';
import { ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/**
 * El documento ya está registrado en la empresa activa (el mismo código, serie y número, o la misma FEL: un número
 * anulado tampoco se vuelve a usar). Trae su id en `detalles.documentoId` para que la pantalla ofrezca abrirlo.
 */
export class DocumentoRepetido extends RecursoDuplicado {
  override readonly codigo = 'documento_repetido';

  constructor(documentoId: string) {
    super('Ese documento ya está registrado en esta empresa.', { documentoId });
  }
}

/** El mes está declarado y el control de períodos declarados está encendido: se reabre el período para tocarlo. */
export class PeriodoDeclarado extends ReglaDeNegocioInfringida {
  readonly codigo = 'periodo_declarado';

  constructor(periodo: string) {
    super(
      `El período ${periodo.slice(0, 7)} ya se declaró: reábralo en Libro de compras para registrar, anular o eliminar documentos de ese mes.`,
      { periodo },
    );
  }
}

/** Un cliente inactivo no recibe documentos nuevos. */
export class ClienteInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'cliente_inactivo';

  constructor() {
    super('El cliente está inactivo: reactívelo para registrarle ventas.');
  }
}

/** Un concepto de ingreso inactivo no se usa en líneas nuevas. */
export class ConceptoDeIngresoInactivo extends ReglaDeNegocioInfringida {
  readonly codigo = 'concepto_de_ingreso_inactivo';

  constructor() {
    super('Uno de los conceptos de ingreso está inactivo: reactívelo o escoja otro.');
  }
}

/** Aviso (no bloquea) de que el mes del documento ya se declaró y habrá que rectificar. */
export function avisoDePeriodoDeclarado(periodo: string): string {
  return `El período ${periodo.slice(0, 7)} ya se declaró: rectifique su declaración.`;
}
