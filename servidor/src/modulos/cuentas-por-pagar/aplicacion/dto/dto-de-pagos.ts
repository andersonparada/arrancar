import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { estaPosfechado, numeroDelPago, type LineaDePago, type LineaDeReintegro } from '../../dominio/pagos.js';
import type {
  LineaDePagoDto,
  PagoDeLaContrasenaDto,
  PagoDelDocumentoDto,
  ReintegroDelDocumentoDto,
} from './pagos.dto.js';

export const dtoDeLineaDePago = (linea: LineaDePago): LineaDePagoDto => ({
  pagoId: linea.pagoId,
  numero: numeroDelPago(linea.numero, linea.anioDeNumero),
  forma: linea.forma,
  fecha: linea.fecha,
  estado: linea.estado,
  contrasenaId: linea.contrasenaId,
  monto: deCentavos(linea.montoCentavos),
  retencionDescontada: deCentavos(linea.retencionDescontadaCentavos),
});

const estaComprometido = (linea: Pick<LineaDePago, 'estado' | 'fecha' | 'fechaDeEfecto'>, hoy: string) =>
  linea.estado === 'vigente' && estaPosfechado(linea, hoy);

const numeroDeChequeDe = ({ numeroDeCheque }: LineaDePago): string | null =>
  typeof numeroDeCheque === 'number' ? String(numeroDeCheque) : null;

export const dtoDePagoDelDocumento = (linea: LineaDePago, hoy: string): PagoDelDocumentoDto => ({
  ...dtoDeLineaDePago(linea),
  comprometido: estaComprometido(linea, hoy),
  numeroDeCheque: numeroDeChequeDe(linea),
});

export const dtoDeReintegro = (linea: LineaDeReintegro): ReintegroDelDocumentoDto => ({
  reintegroId: linea.reintegroId,
  numero: numeroDelPago(linea.numero, linea.anioDeNumero),
  forma: linea.forma,
  fecha: linea.fecha,
  estado: linea.estado,
  monto: deCentavos(linea.montoCentavos),
});

/** Las líneas de una contraseña juntas por pago: cada pago una vez, con lo que entregó en ella. */
export function dtoDePagosDeLaContrasena(lineas: readonly LineaDePago[], hoy: string): PagoDeLaContrasenaDto[] {
  const porPago = new Map<string, { linea: LineaDePago; montoCentavos: number }>();
  for (const linea of lineas) {
    const previo = porPago.get(linea.pagoId);
    porPago.set(linea.pagoId, { linea, montoCentavos: (previo?.montoCentavos ?? 0) + linea.montoCentavos });
  }
  return [...porPago.values()].map(({ linea, montoCentavos }) => ({
    pagoId: linea.pagoId,
    numero: numeroDelPago(linea.numero, linea.anioDeNumero),
    forma: linea.forma,
    fecha: linea.fecha,
    estado: linea.estado,
    monto: deCentavos(montoCentavos),
    comprometido: estaComprometido(linea, hoy),
    numeroDeCheque: numeroDeChequeDe(linea),
  }));
}
