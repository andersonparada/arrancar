import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { TipoDeLibro } from '../libro/tipo-de-libro.js';
import type { RemanentesDeRetenciones } from './remanentes-de-retenciones.js';

/**
 * Los totales del libro del período en el momento de declararlo. Los montos son texto con dos decimales; la huella es
 * la del libro (documento y montos de cada fila), así dos fotos iguales tienen la misma huella.
 */
export interface FotoDelPeriodo {
  version: 1;
  tipoDeLibro: TipoDeLibro;
  documentos: number;
  huella: string;
  /** El resumen mensual del libro (totales por columna, por código DTE, crédito del período...). */
  resumen: Record<string, unknown>;
  /** Las cifras de ventas que respondieron los módulos de ventas (vacío o ausente si no hay ninguno activo). */
  ventas?: CifrasDeVentasEnLaFoto[];
  /** El remanente de retenciones (SAT-2237) o de constancias (SAT-2046); ausente si no hay ventas que lo calculen. */
  remanentes?: RemanentesDeRetenciones;
}

/** Una cifra de ventas tal como se guarda en la foto. */
export interface CifraDeVentasEnLaFoto {
  clave: string;
  etiqueta: string;
  tipo: 'monto' | 'cantidad';
  valor: string;
}

/** Lo que respondió un módulo de ventas sobre el período. */
export interface CifrasDeVentasEnLaFoto {
  modulo: string;
  clave: string;
  cifras: CifraDeVentasEnLaFoto[];
}

export interface CambioDeLaFoto {
  clave: string;
  anterior: string;
  actual: string;
  cambio: string;
}

/** Qué cambió entre dos fotos: solo las cifras que son distintas. */
export interface DiferenciaDeFotos {
  cambios: CambioDeLaFoto[];
  /** La huella cambió: algún documento se registró, anuló o eliminó, o cambió un monto. */
  huellaCambio: boolean;
}

const esMonto = (texto: string): boolean => /^-?\d+\.\d{2}$/.test(texto);

/** Una cifra por clave: `resumen.totales.iva`, `resumen.porTipoDte[FACT].total`... */
function aplanar(valor: unknown, clave: string, salida: Map<string, string>): void {
  if (typeof valor === 'number') salida.set(clave, String(valor));
  else if (typeof valor === 'string' && esMonto(valor)) salida.set(clave, valor);
  else if (Array.isArray(valor)) {
    valor.forEach((item: Record<string, unknown>, indice) => {
      const nombre = String(item['tipoDte'] ?? item['motivo'] ?? indice);
      aplanar(item, `${clave}[${nombre}]`, salida);
    });
  } else if (valor && typeof valor === 'object') {
    for (const [nombre, interno] of Object.entries(valor)) aplanar(interno, `${clave}.${nombre}`, salida);
  }
}

/** Los módulos de ventas que respondieron en las dos fotos: solo sus cifras se pueden comparar. */
function modulosEnComun(anterior: FotoDelPeriodo, actual: FotoDelPeriodo): Set<string> {
  const delAnterior = new Set((anterior.ventas ?? []).map((v) => v.modulo));
  return new Set((actual.ventas ?? []).map((v) => v.modulo).filter((modulo) => delAnterior.has(modulo)));
}

function cifrasDe(foto: FotoDelPeriodo, modulos: Set<string>, conRemanentes: boolean): Map<string, string> {
  const cifras = new Map<string, string>([['documentos', String(foto.documentos)]]);
  aplanar(foto.resumen, 'resumen', cifras);
  if (conRemanentes) aplanar(foto.remanentes, 'remanentes', cifras);
  for (const { modulo, clave, cifras: deVentas } of foto.ventas ?? []) {
    if (!modulos.has(modulo)) continue;
    for (const cifra of deVentas) cifras.set(`${clave}[${modulo}].${cifra.clave}`, cifra.valor);
  }
  return cifras;
}

const restar = (actual: string, anterior: string): string =>
  esMonto(actual) || esMonto(anterior)
    ? deCentavos(aCentavos(actual) - aCentavos(anterior))
    : String(Number(actual) - Number(anterior));

const cero = (referencia: string): string => (esMonto(referencia) ? '0.00' : '0');

/**
 * Compara dos fotos cifra por cifra; las del libro que falten en una valen cero. Las cifras de ventas se comparan solo
 * si ambas fotos traen respuesta de ese módulo (sin respuesta no hay punto de comparación, no es cero). Las cifras que
 * no cambian no salen.
 */
export function diferenciaDeFotos(anterior: FotoDelPeriodo, actual: FotoDelPeriodo): DiferenciaDeFotos {
  const modulos = modulosEnComun(anterior, actual);
  const conRemanentes = anterior.remanentes !== undefined && actual.remanentes !== undefined;
  const antes = cifrasDe(anterior, modulos, conRemanentes);
  const ahora = cifrasDe(actual, modulos, conRemanentes);
  const claves = [...new Set([...antes.keys(), ...ahora.keys()])].sort();
  const cambios: CambioDeLaFoto[] = [];
  for (const clave of claves) {
    const valorAnterior = antes.get(clave) ?? cero(ahora.get(clave)!);
    const valorActual = ahora.get(clave) ?? cero(valorAnterior);
    if (valorAnterior === valorActual) continue;
    cambios.push({ clave, anterior: valorAnterior, actual: valorActual, cambio: restar(valorActual, valorAnterior) });
  }
  return { cambios, huellaCambio: anterior.huella !== actual.huella };
}
