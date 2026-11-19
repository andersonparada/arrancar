import {
  CodigoDelBanguatEnGtq,
  LetrasIncompletas,
  MonedaBaseNoSeDesactiva,
  MonedaSinDosDecimales,
  TipoDeCambioDelQuetzal,
} from './errores.js';

/** El quetzal: la moneda de los libros de todas las empresas. */
export const MONEDA_BASE = 'GTQ';
const DECIMALES_ACTIVABLES = 2;

/** Una moneda del catálogo (ISO 4217) tal como la ve la aplicación. */
export interface Moneda {
  codigo: string;
  nombre: string;
  simbolo: string;
  decimales: number;
  activa: boolean;
  /** El `moneda:int` del Banguat; sin él no se carga su tipo de cambio. */
  codigoBanguat: number | null;
  letrasSingular: string | null;
  letrasPlural: string | null;
}

/** Lo que soporte puede cambiar de una moneda; lo que falta no se toca. */
export interface CambiosDeMoneda {
  activa?: boolean;
  codigoBanguat?: number | null;
  letrasSingular?: string | null;
  letrasPlural?: string | null;
}

/**
 * La moneda con los cambios aplicados, si cumplen las reglas: el quetzal siempre activo y sin código del Banguat, solo
 * se activan monedas de dos decimales y las letras van completas. Lo que depende de otros datos (que el código se
 * ofrezca, esté libre y no mezcle series) lo revisa el caso de uso.
 */
export function aplicarCambios<M extends Moneda>(moneda: M, cambios: CambiosDeMoneda): M {
  const nueva = { ...moneda, ...quitarFaltantes(cambios) };
  if (nueva.codigo === MONEDA_BASE) revisarQuetzal(nueva);
  if (nueva.activa && !moneda.activa && nueva.decimales !== DECIMALES_ACTIVABLES)
    throw new MonedaSinDosDecimales(nueva.codigo, nueva.decimales);
  if ((nueva.letrasSingular === null) !== (nueva.letrasPlural === null)) throw new LetrasIncompletas();
  return nueva;
}

function revisarQuetzal(moneda: Moneda): void {
  if (!moneda.activa) throw new MonedaBaseNoSeDesactiva();
  if (moneda.codigoBanguat !== null) throw new CodigoDelBanguatEnGtq();
}

function quitarFaltantes(cambios: CambiosDeMoneda): CambiosDeMoneda {
  return Object.fromEntries(Object.entries(cambios).filter(([, valor]) => valor !== undefined));
}

/** @throws TipoDeCambioDelQuetzal si la moneda es el quetzal. */
export function exigirMonedaExtranjera(codigo: string): void {
  if (codigo === MONEDA_BASE) throw new TipoDeCambioDelQuetzal();
}
