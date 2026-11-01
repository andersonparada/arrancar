import type {
  CasillaDelSat2237,
  MontoDeRubro,
  OperacionDelSegmento9,
  ProveedorDelSat2237,
  RubroDelSat2237,
} from '../../servicios/sat-2237.api';

const aCentavos = (monto: string): number => Math.round(Number(monto) * 100);

/** Los proveedores de mayor a menor crédito fiscal; a igual crédito, por nombre. */
export function ordenarPorCredito(filas: ProveedorDelSat2237[]): ProveedorDelSat2237[] {
  return [...filas].sort(
    (a, b) => aCentavos(b.credito) - aCentavos(a.credito) || a.nombre.localeCompare(b.nombre, 'es'),
  );
}

const esCero = (monto: MontoDeRubro): boolean => aCentavos(monto.base) === 0 && aCentavos(monto.iva) === 0;

/** Un rubro sin ningún movimiento (se muestra atenuado, pero se muestra: el formulario lo pide completo). */
export const rubroSinMovimiento = (rubro: RubroDelSat2237): boolean =>
  [rubro.facturas, rubro.notasDeDebito, rubro.notasDeCredito, rubro.neto].every(esCero);

/** Cantidad con su singular o plural: «1 documento», «3 documentos». */
export const textoDeDocumentos = (cantidad: number): string =>
  `${cantidad} ${cantidad === 1 ? 'documento' : 'documentos'}`;

/** Los tipos DTE de una operación para mostrar, o un guion si no tiene. */
export const tiposDeLaOperacion = (operacion: OperacionDelSegmento9): string =>
  operacion.tiposDte.length ? operacion.tiposDte.join(', ') : '—';

/** Las cantidades de un proveedor en una línea corta: «2 facturas · 1 nota de crédito». */
export function resumenDeDocumentos(fila: ProveedorDelSat2237): string {
  const partes = [
    [fila.cantidadDeFacturas, 'factura', 'facturas'],
    [fila.cantidadDeNotasDeCredito, 'nota de crédito', 'notas de crédito'],
    [fila.cantidadDeNotasDeDebito, 'nota de débito', 'notas de débito'],
  ] as const;
  return partes
    .filter(([cantidad]) => cantidad > 0)
    .map(([cantidad, singular, plural]) => `${cantidad} ${cantidad === 1 ? singular : plural}`)
    .join(' · ');
}

/** Los rubros que suman en una casilla, con su nombre: «Regímenes sin IVA + Exento y no afecto». */
export function textoDeRubrosDeLaCasilla(casilla: CasillaDelSat2237, rubros: RubroDelSat2237[]): string {
  const nombres = casilla.rubros.map((clave) => rubros.find((r) => r.clave === clave)?.nombre ?? clave);
  return nombres.length ? nombres.join(' + ') : '—';
}

/** Qué es el IVA de una casilla: crédito fiscal o el que fue al costo. */
export const etiquetaDelIva = (casilla: CasillaDelSat2237): string =>
  casilla.ivaDeCredito ? 'IVA con crédito' : 'IVA al costo';

/** Aviso de la sección 6 cuando hay más proveedores que lugares; vacío si caben todos. */
export function avisoDeProveedoresSinLugar(sinLugar: number, maximo: number): string {
  if (sinLugar === 0) return '';
  const quedan = sinLugar === 1 ? 'queda 1 proveedor' : `quedan ${sinLugar} proveedores`;
  return `El formulario admite ${maximo} proveedores: ${quedan} fuera de la lista, los de menor compra.`;
}
