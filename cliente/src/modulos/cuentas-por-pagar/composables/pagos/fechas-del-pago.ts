import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { NotaParaLigar, ParaPagar } from '../../servicios/tipos-de-pagos';
import { etiquetaDeDocumento } from '../contrasenas/edicion-de-contrasena';
import { fechaFijaDeApertura, type EdicionDePago, type LineaDelPago } from './edicion-de-pago';

/** Un cheque o una nota con fecha de después de hoy es un posfechado: el documento queda comprometido hasta esa fecha. */
export const esPosfechado = (fecha: string, hoy: string): boolean => !!fecha && fecha > hoy;

/** Una fecha que el pago no puede preceder y por qué. */
export interface LimiteDeFecha {
  fecha: string;
  porque: string;
}

const INICIO = 'la fecha de inicio del sistema';

/** La emisión de cada factura y, con un saldo inicial, la fecha de inicio. El servidor valida igual. */
export function fechaMinimaDelPago(lineas: readonly LineaDelPago[], datos: ParaPagar): LimiteDeFecha | null {
  const limites: LimiteDeFecha[] = lineas.map(({ cargo }) => ({
    fecha: cargo.fechaDeEmision,
    porque: `la emisión de la factura ${etiquetaDeDocumento(cargo)}`,
  }));
  if (datos.fechaDeInicio && lineas.some(({ cargo }) => cargo.origen === 'saldo_inicial')) {
    limites.push({ fecha: datos.fechaDeInicio, porque: INICIO });
  }
  return limites.reduce<LimiteDeFecha | null>(
    (mayor, limite) => (!mayor || limite.fecha > mayor.fecha ? limite : mayor),
    null,
  );
}

/** La nota que el usuario escogió entre las ya registradas, o `null`. */
export function notaElegida(edicion: EdicionDePago, notas: readonly NotaParaLigar[]): NotaParaLigar | null {
  return notas.find(({ movimientoId }) => movimientoId === edicion.movimientoId) ?? null;
}

/** La última fecha que deja elegir el calendario: una nota ligada o la apertura no pueden ser futuras. */
export const fechaMaximaDelPago = (forma: EdicionDePago['forma'], hoy: string): string | undefined =>
  forma === 'nota_ligada' || forma === 'cuenta_de_apertura' ? hoy : undefined;

export interface ContextoDeFecha {
  hoy: string;
  datos: ParaPagar;
  lineas: readonly LineaDelPago[];
  nota: NotaParaLigar | null;
}

/** Los límites inferiores según la forma: la apertura mira la fecha de inicio; una nota ligada, además, la de la nota. */
function limitesInferiores(edicion: EdicionDePago, { datos, lineas, nota }: ContextoDeFecha): LimiteDeFecha[] {
  if (edicion.forma === 'cuenta_de_apertura') {
    return datos.fechaDeInicio ? [{ fecha: datos.fechaDeInicio, porque: INICIO }] : [];
  }
  const minima = fechaMinimaDelPago(lineas, datos);
  const deLaNota =
    edicion.forma === 'nota_ligada' && nota ? [{ fecha: nota.fecha, porque: 'la fecha de la nota en Bancos' }] : [];
  return [...(minima ? [minima] : []), ...deLaNota];
}

/** El error de la fecha antes de molestar al servidor, o `null` si está bien. */
export function errorDeLaFecha(edicion: EdicionDePago, contexto: ContextoDeFecha): string | null {
  if (fechaFijaDeApertura(edicion, contexto.datos)) return null;
  if (!edicion.fecha) return 'Escriba la fecha del pago.';
  const maxima = fechaMaximaDelPago(edicion.forma, contexto.hoy);
  if (maxima && edicion.fecha > maxima) return 'Esta forma de pago no puede llevar una fecha futura.';
  const limite = limitesInferiores(edicion, contexto).find(({ fecha }) => edicion.fecha < fecha);
  return limite ? `No puede ser anterior al ${formatearFecha(limite.fecha)}, ${limite.porque}.` : null;
}

/** Lo que se le dice al usuario bajo la fecha: de dónde sale, qué mínima tiene y qué pasa si es futura. */
export function ayudaDeLaFecha(edicion: EdicionDePago, contexto: Omit<ContextoDeFecha, 'hoy' | 'nota'>): string {
  const fija = fechaFijaDeApertura(edicion, contexto.datos);
  if (fija) return `Con la carga inicial abierta se registra con la fecha de inicio (${formatearFecha(fija)}).`;
  const limite = limitesInferiores(edicion, { ...contexto, hoy: '', nota: null })[0];
  const minima = limite ? `No puede ser anterior al ${formatearFecha(limite.fecha)}, ${limite.porque}. ` : '';
  const posfechable = edicion.forma === 'cheque' || edicion.forma === 'nota_de_debito';
  return `${minima}${posfechable ? 'Con fecha futura es un pago posfechado.' : ''}`.trim();
}
