/**
 * Montos de la bandeja en centavos enteros: el servidor manda y recibe texto con dos decimales, y los cálculos
 * del reparto no deben pasar por números con decimales.
 */

const FORMATO_DE_MONTO = /^-?\d+(\.\d{1,2})?$/;

/** El texto de un monto en centavos; `null` si no es un monto con hasta dos decimales. */
export function centavosDeTexto(valor: string | number | null | undefined): number | null {
  const texto = String(valor ?? '').trim();
  if (!FORMATO_DE_MONTO.test(texto)) return null;
  const negativo = texto.startsWith('-');
  const [enteros = '0', decimales = ''] = texto.replace('-', '').split('.');
  const centavos = Number(enteros) * 100 + Number(decimales.padEnd(2, '0'));
  return negativo ? -centavos : centavos;
}

/** Centavos como texto con dos decimales (`-1234.50`), como lo espera el servidor. */
export function textoDeCentavos(centavos: number): string {
  const signo = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(centavos);
  return `${signo}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

/**
 * Reparte un monto en `unidades` partes iguales: cada una recibe `floor(monto / unidades)` centavos y la última,
 * el sobrante. Así lo hace el servidor; aquí solo se muestra.
 */
export function repartirEnUnidades(centavos: number, unidades: number): number[] {
  if (!Number.isInteger(unidades) || unidades < 1) return [];
  const base = Math.floor(centavos / unidades);
  const partes = Array.from({ length: unidades }, () => base);
  partes[unidades - 1] = centavos - base * (unidades - 1);
  return partes;
}

/** Lo que cuesta cada activo y su última unidad cuando el reparto deja sobrante. */
export interface CostoPorUnidad {
  cadaUna: number;
  ultima: number;
  /** Si es distinta de `cadaUna`, la última recibe el sobrante del redondeo. */
  conSobrante: boolean;
}

export function costoPorUnidad(centavos: number, unidades: number): CostoPorUnidad | null {
  const partes = repartirEnUnidades(centavos, unidades);
  if (partes.length === 0) return null;
  const cadaUna = partes[0] ?? 0;
  const ultima = partes[partes.length - 1] ?? 0;
  return { cadaUna, ultima, conSobrante: ultima !== cadaUna };
}
