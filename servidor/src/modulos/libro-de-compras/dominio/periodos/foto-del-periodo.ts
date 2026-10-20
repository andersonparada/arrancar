import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { TipoDeLibro } from '../libro/tipo-de-libro.js';

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

function cifrasDe(foto: FotoDelPeriodo): Map<string, string> {
  const cifras = new Map<string, string>([['documentos', String(foto.documentos)]]);
  aplanar(foto.resumen, 'resumen', cifras);
  return cifras;
}

const restar = (actual: string, anterior: string): string =>
  esMonto(actual) || esMonto(anterior)
    ? deCentavos(aCentavos(actual) - aCentavos(anterior))
    : String(Number(actual) - Number(anterior));

const cero = (referencia: string): string => (esMonto(referencia) ? '0.00' : '0');

/** Compara dos fotos cifra por cifra; lo que falta en una vale cero. Las cifras que no cambian no salen. */
export function diferenciaDeFotos(anterior: FotoDelPeriodo, actual: FotoDelPeriodo): DiferenciaDeFotos {
  const antes = cifrasDe(anterior);
  const ahora = cifrasDe(actual);
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
