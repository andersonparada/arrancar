import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';

/** El documento no dice su tipo: ni la familia (`tipo`) ni el código de la SAT (`tipoDte`). */
export class TipoDeDocumentoObligatorio extends DatoInvalido {
  readonly codigo = 'tipo_de_documento_obligatorio';

  constructor() {
    super('Diga el tipo de documento: el código de la SAT (tipoDte) o su familia (tipo).');
  }
}

/** Un documento con FEL debe decir su código de la SAT (`FACT`, `FPEQ`, `NCRE`...). */
export class TipoDteObligatorio extends DatoInvalido {
  readonly codigo = 'tipo_dte_obligatorio';

  constructor() {
    super('Un documento con FEL necesita el código de la SAT del tipo de documento (tipoDte).');
  }
}

/** El código de la SAT es de un documento FEL: sin autorización de la FEL no se escribe. */
export class TipoDteSinFel extends DatoInvalido {
  readonly codigo = 'tipo_dte_sin_fel';

  constructor() {
    super('El código de la SAT (tipoDte) solo se escribe en un documento con FEL.');
  }
}

/** El código de la SAT y la familia no son de la misma clase de documento. */
export class TipoDteIncoherente extends DatoInvalido {
  readonly codigo = 'tipo_dte_incoherente';

  constructor(tipoDte: string, tipo: string) {
    super(`El código ${tipoDte} no corresponde al tipo de documento "${tipo}".`);
  }
}

/** La factura especial se registra en un paso posterior (R2-6). */
export class FacturaEspecialNoDisponible extends ReglaDeNegocioInfringida {
  readonly codigo = 'factura_especial_no_disponible';

  constructor() {
    super('La factura especial estará disponible próximamente.');
  }
}

/** La familia de documento ya no se emite: la fecha de emisión es posterior a la derogación de su régimen. */
export class FamiliaDerogada extends ReglaDeNegocioInfringida {
  readonly codigo = 'familia_derogada';

  constructor(fechaDeDerogacion: string) {
    super(
      `Este tipo de factura está derogado: solo se registra si se emitió antes del ${fechaDeDerogacion}. Revise la fecha de emisión o el tipo.`,
    );
  }
}

/** La factura del productor primario o pecuario no existía antes de su inicio (Decreto 31-2024). */
export class FamiliaAunNoVigente extends ReglaDeNegocioInfringida {
  readonly codigo = 'familia_aun_no_vigente';

  constructor(inicio: string) {
    super(`La factura de productor primario o pecuario se emite desde el ${inicio}: revise la fecha de emisión.`);
  }
}
