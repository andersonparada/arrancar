import type { DatosFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import { NotaDeDebitoAnteriorALaFactura, NotaDeDebitoConIvaDeFacturaSinIva } from './errores-de-calculo.js';
import type { DatosDeLaFacturaAfectada } from './reglas-de-notas-de-credito.js';
import { MOTIVOS_SIN_IVA } from './tipos-de-documento.js';

/** Por qué cobra la nota de débito: solo sirve para avisar y proponer el concepto; no cambia el cálculo. */
export const CLASES_DE_CARGO = ['precio', 'intereses', 'otros'] as const;
export type ClaseDeCargo = (typeof CLASES_DE_CARGO)[number];

export const AVISO_DE_RETENCION_SOBRE_NOTA_DE_DEBITO =
  'Verifique con su contador si debe retener sobre esta nota de débito.';

export const AVISO_DE_INTERESES_EN_NOTA_DE_DEBITO =
  'Los intereses son gasto financiero y podrían llevar retención sobre rentas de capital; consulte a su contador.';

/** Lo propio de la nota de débito que se revisa al calcularla. */
export interface DatosDeLaNotaDeDebito extends DatosDeLaFacturaAfectada {
  fechaDeEmision: string;
  /** IVA que dice la FEL, en centavos, si el usuario lo escribió. */
  ivaDeLaFel?: number | null;
}

/**
 * La nota de débito no es anterior a su factura y, si la factura no cobra IVA (pequeño contribuyente, agropecuario,
 * primario o pecuario), tampoco trae IVA: el cálculo lo deja en cero y el IVA de la FEL no puede contradecirlo.
 * @throws NotaDeDebitoAnteriorALaFactura o NotaDeDebitoConIvaDeFacturaSinIva.
 */
export function exigirNotaDeDebitoCoherente(datos: DatosDeLaNotaDeDebito): void {
  if (datos.fechaDeLaFactura !== undefined && datos.fechaDeEmision < datos.fechaDeLaFactura) {
    throw new NotaDeDebitoAnteriorALaFactura();
  }
  const facturaSinIva = !!datos.motivoDeLaFactura && MOTIVOS_SIN_IVA.includes(datos.motivoDeLaFactura);
  if (facturaSinIva && (datos.ivaDeLaFel ?? 0) > 0) throw new NotaDeDebitoConIvaDeFacturaSinIva();
}

/**
 * Avisos de la nota de débito, que no bloquean: no se le calculan retenciones, así que a la empresa agente de IVA o
 * de ISR se le recuerda consultarlo, y con intereses se avisa del gasto financiero y la renta de capital.
 */
export function avisosDeNotaDeDebito(datos: {
  empresa: DatosFiscalesDeEmpresa;
  claseDeCargo?: ClaseDeCargo | null;
}): string[] {
  const empresa = datos.empresa.instantanea();
  const esAgente = empresa.agenteDeRetencionIva !== 'ninguno' || empresa.esAgenteDeRetencionIsr;
  return [
    ...(esAgente ? [AVISO_DE_RETENCION_SOBRE_NOTA_DE_DEBITO] : []),
    ...(datos.claseDeCargo === 'intereses' ? [AVISO_DE_INTERESES_EN_NOTA_DE_DEBITO] : []),
  ];
}
