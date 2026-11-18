import type { EfectoFiscal } from './bancarizacion-de-pagos.js';

export const MARCA_DE_CREDITO_FISCAL = 'Crédito fiscal en riesgo por bancarización';
export const MARCA_DE_COSTO_NO_DEDUCIBLE = 'Costo no deducible';
export const NOTA_DE_IVA_NO_CONOCIDO = 'IVA no conocido';

/** Un cargo con lo que R9 necesita para marcarlo. Las cifras van en centavos. */
export interface CargoParaMarcar {
  /** El total antes de retenciones (en un saldo inicial, su `saldo_al_inicio`). */
  totalCentavos: number;
  /** `iva − iva_no_acreditable` del documento del libro; `null` en un saldo inicial. */
  ivaAcreditableCentavos: number | null;
  /** El IVA del documento del libro; `null` en un saldo inicial. */
  ivaCentavos: number | null;
  esSaldoInicial: boolean;
  /** Lo que la empresa pierde sin bancarización; `null` si no tiene datos fiscales para saberlo. */
  efecto: EfectoFiscal | null;
}

/** Lo que R9 marca de un cargo pagado en efectivo. */
export interface MarcasDelCargo {
  creditoFiscalEnRiesgo: boolean;
  /** El IVA completo del cargo, aunque solo una parte se haya pagado en efectivo; 0 si no se conoce. */
  ivaEnRiesgoCentavos: number;
  costoNoDeducible: boolean;
  /** El cargo completo sin IVA; en un saldo inicial, su neto. */
  costoNoDeducibleCentavos: number;
  /** Saldo inicial con efecto: no se sabe cuánto IVA tenía. */
  ivaNoConocido: boolean;
  /** Los textos de las marcas, en el orden en que se muestran. */
  marcas: string[];
}

/** El IVA completo del cargo (el acreditable del libro): lo que se pierde si el pago no está bancarizado. */
const ivaEnRiesgo = (cargo: CargoParaMarcar): number => cargo.ivaAcreditableCentavos ?? 0;

/** El cargo completo sin IVA; en un saldo inicial, su neto. */
const costoSinIva = (cargo: CargoParaMarcar): number => cargo.totalCentavos - (cargo.ivaCentavos ?? 0);

const textosDeLasMarcas = (iva: boolean, isr: boolean): string[] => [
  ...(iva ? [MARCA_DE_CREDITO_FISCAL] : []),
  ...(isr ? [MARCA_DE_COSTO_NO_DEDUCIBLE] : []),
];

/** Las marcas fiscales de un cargo (diseño de CP5 R9, dictamen 10): sin efecto, no hay ninguna. */
export function marcasDelCargo(cargo: CargoParaMarcar): MarcasDelCargo {
  const iva = cargo.efecto?.iva === true;
  const isr = cargo.efecto?.isr === true;
  return {
    creditoFiscalEnRiesgo: iva,
    ivaEnRiesgoCentavos: iva ? ivaEnRiesgo(cargo) : 0,
    costoNoDeducible: isr,
    costoNoDeducibleCentavos: isr ? costoSinIva(cargo) : 0,
    ivaNoConocido: cargo.esSaldoInicial && (iva || isr),
    marcas: textosDeLasMarcas(iva, isr),
  };
}

/** El cargo tiene algún efecto fiscal sin bancarización. */
export const tieneEfectoFiscal = (efecto: EfectoFiscal | null): boolean =>
  efecto !== null && (efecto.iva || efecto.isr);
