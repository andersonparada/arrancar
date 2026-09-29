import { DatoInvalido } from '../../core/compartido/dominio/errores.js';
import { aCentavos } from './centavos.js';

/** El interés bruto y el ISR que el banco retuvo (H8); el `monto` de la nota es el neto: bruto - ISR. */
export interface DatosDeIntereses {
  interesBruto?: string | null;
  isrRetenido?: string | null;
}

/** Lo que guarda un movimiento: los dos datos, o `null` en los dos. */
export interface PropiedadesDeIntereses {
  interesBruto: string | null;
  isrRetenido: string | null;
}

export class DatosDeInteresesObligatorios extends DatoInvalido {
  readonly codigo = 'datos_de_intereses_obligatorios';

  constructor() {
    super('Este concepto pide el interés bruto y el ISR retenido (escriba 0.00 si el banco no retuvo).');
  }
}

export class DatosDeInteresesNoAplican extends DatoInvalido {
  readonly codigo = 'datos_de_intereses_no_aplican';

  constructor() {
    super(
      'El interés bruto y el ISR retenido solo van en notas con un concepto que los pide, como «Intereses ganados».',
    );
  }
}

export class InteresesNoCuadran extends DatoInvalido {
  readonly codigo = 'intereses_no_cuadran';

  constructor() {
    super('El interés bruto debe ser igual al monto (el neto que acreditó el banco) más el ISR retenido.');
  }
}

const hay = (dato: string | null | undefined): dato is string => dato !== null && dato !== undefined;

/** Bruto = monto (el neto) + ISR, con ISR no negativo y solo en una nota de crédito. */
function cuadran({ tipo, monto }: { tipo: string; monto: string }, bruto: string, isrRetenido: string): boolean {
  const isr = aCentavos(isrRetenido);
  return tipo === 'credito' && isr >= 0 && aCentavos(bruto) === aCentavos(monto) + isr;
}

/**
 * Revisa los datos de intereses de una nota contra su concepto: si el concepto los pide, vienen los dos y
 * cuadran (bruto = monto + ISR, ISR no negativo, nota de crédito); si no los pide, no viene ninguno.
 * @throws DatosDeInteresesObligatorios, DatosDeInteresesNoAplican o InteresesNoCuadran.
 */
export function exigirInteresesCoherentes(
  nota: DatosDeIntereses & { tipo: string; monto: string },
  conceptoPideIntereses: boolean,
): void {
  const { interesBruto, isrRetenido } = nota;
  if (!conceptoPideIntereses) {
    if (hay(interesBruto) || hay(isrRetenido)) throw new DatosDeInteresesNoAplican();
    return;
  }
  if (!hay(interesBruto) || !hay(isrRetenido)) throw new DatosDeInteresesObligatorios();
  if (!cuadran(nota, interesBruto, isrRetenido)) throw new InteresesNoCuadran();
}
