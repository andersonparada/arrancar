import { aCentavos, deCentavos } from '../../core/compartido/dominio/centavos.js';
import { dividirRedondeando } from './aritmetica-fiscal.js';
import { ExentoNegativoDelDte } from './errores-de-bandeja.js';
import { esFamiliaSinIva } from './familia-del-documento.js';
import { ivaDelDocumento, toleranciaDeIvaEnCentavos } from './reparto-de-iva.js';
import { esNota, FAMILIA_DEL_TIPO_DTE, type TipoDte } from './tipos-de-documento.js';

/** Los montos del DTE tal como los dice la SAT (texto con dos decimales). */
export interface MontosDelDte {
  tipoDte: TipoDte;
  total: string;
  iva: string;
  idp: string;
  otrosImpuestos: string;
}

/** Los montos de la única línea del documento propuesto; `null` es cero y se manda como si no estuviera. */
export interface MontosPropuestos {
  idp: string | null;
  otrosImpuestos: string | null;
  exento: string;
  /** `null` en las familias sin IVA y en el recibo: no hay IVA que corregir. */
  ivaDeLaFel: string | null;
  avisos: string[];
}

const UNA_LINEA = 1;

const nuloSiCero = (centavos: number): string | null => (centavos === 0 ? null : deCentavos(centavos));

/** El gravado que dejaría un IVA, en centavos: `round(iva × (100 + tasa) / tasa)`. */
function gravadoDelIva(iva: number, tasaEnCentesimas: number): number {
  return Number(dividirRedondeando(BigInt(iva) * BigInt(10000 + tasaEnCentesimas), BigInt(tasaEnCentesimas)));
}

/** Los montos tal como los dice el DTE, sin deducir exento ni corregir el IVA, para que el usuario los revise. */
export function montosSinDeducir(montos: MontosDelDte, aviso: string): MontosPropuestos {
  const base = { idp: nuloSiCero(aCentavos(montos.idp)), otrosImpuestos: nuloSiCero(aCentavos(montos.otrosImpuestos)) };
  return { ...base, exento: '0.00', ivaDeLaFel: null, avisos: [aviso] };
}

const avisoDeExento = (exento: number): string => `Se dedujo un exento de Q${deCentavos(exento)}: revise la factura.`;

function exentoDeducido(datos: { iva: number; restante: number }, tasaEnCentesimas: number): number {
  const { iva, restante } = datos;
  const esperado = ivaDelDocumento(restante, tasaEnCentesimas);
  if (Math.abs(iva - esperado) <= toleranciaDeIvaEnCentavos(UNA_LINEA)) return 0;
  if (iva === 0) return restante;
  const exento = restante - gravadoDelIva(iva, tasaEnCentesimas);
  if (exento < 0) throw new ExentoNegativoDelDte();
  return exento;
}

/**
 * Los montos de la línea única que se propone para un DTE del Excel de la SAT, que no separa base y exento. Con
 * `R = total − IDP − otros impuestos`: si el IVA del DTE se aparta del que saldría de `R` hasta `max(5, líneas)`
 * centavos, no hay exento; si no, el exento es `R` menos el gravado que dice el IVA (todo `R` si el IVA es cero).
 * Las notas, las familias sin IVA y los recibos no deducen nada.
 * @throws ExentoNegativoDelDte si el IVA del DTE es mayor que el que corresponde al total.
 */
export function montosPropuestosDelDte(montos: MontosDelDte, tasaEnCentesimas: number): MontosPropuestos {
  const idp = aCentavos(montos.idp);
  const otros = aCentavos(montos.otrosImpuestos);
  const base = { idp: nuloSiCero(idp), otrosImpuestos: nuloSiCero(otros) };
  const familia = FAMILIA_DEL_TIPO_DTE[montos.tipoDte];
  if (esFamiliaSinIva(familia) || familia === 'recibo') {
    return { ...base, exento: '0.00', ivaDeLaFel: null, avisos: [] };
  }
  const iva = aCentavos(montos.iva);
  const conIva = { ...base, ivaDeLaFel: deCentavos(iva) };
  if (esNota(familia)) return { ...conIva, exento: '0.00', avisos: [] };
  const exento = exentoDeducido({ iva, restante: aCentavos(montos.total) - idp - otros }, tasaEnCentesimas);
  return { ...conIva, exento: deCentavos(exento), avisos: exento > 0 ? [avisoDeExento(exento)] : [] };
}
