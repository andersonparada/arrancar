import { formatearFecha } from '@/modulos/core/utilidades/formato';
import type { NotaParaLigar, ParaPagar } from '../../servicios/tipos-de-pagos';
import { montoDeCentavos } from './errores-del-pago';
import {
  diferenciasMarcadas,
  lineasDelPago,
  retencionDelPago,
  totalDelPago,
  type EdicionDePago,
  type LineaDelPago,
} from './edicion-de-pago';
import { esPosfechado, fechaMinimaDelPago } from './fechas-del-pago';

const CUANTOS = (cantidad: number, uno: string, varios: string): string =>
  `${cantidad} ${cantidad === 1 ? uno : varios}`;

/** Con qué se paga, en palabras: «un cheque de la chequera…», «una nota de débito…», etc. */
function conQueSePaga(edicion: EdicionDePago, nota: NotaParaLigar | null): string {
  if (edicion.forma === 'cheque') return 'Se emitirá un cheque en Bancos';
  if (edicion.forma === 'nota_de_debito') return 'Se registrará una nota de débito en Bancos';
  if (edicion.forma === 'nota_ligada') {
    return `Se aplicará la nota de débito${nota?.numero ? ` ${nota.numero}` : ''} que ya está en Bancos (sin mover dinero otra vez)`;
  }
  return 'Se darán por pagados saldos iniciales sin mover dinero';
}

export interface ContextoDelResumen {
  datos: ParaPagar;
  nota: NotaParaLigar | null;
  hoy: string;
}

/** Lo que va a pasar al confirmar: con qué, a nombre de quién, cuánto, a qué documentos y con qué fecha. */
export function resumenDelPago(edicion: EdicionDePago, { datos, nota, hoy }: ContextoDelResumen): string {
  const lineas = lineasDelPago(edicion, datos);
  const fecha = edicion.fecha || fechaMinimaDelPago(lineas, datos)?.fecha || hoy;
  const contrasenas = new Set(lineas.map(({ cargo }) => cargo.contrasenaId));
  const partes = [
    `${conQueSePaga(edicion, nota)} por ${montoDeCentavos(totalDelPago(lineas))}, fecha ${formatearFecha(fecha)}.`,
    `Pagará ${CUANTOS(lineas.length, 'documento', 'documentos')} de ${CUANTOS(contrasenas.size, 'contraseña', 'contraseñas')}.`,
    ...lineasOpcionales(edicion, datos, lineas),
  ];
  if (esPosfechado(edicion.fecha, hoy) && edicion.forma !== 'cuenta_de_apertura') {
    partes.push('Es un pago posfechado: el documento queda comprometido hasta esa fecha.');
  }
  return partes.join('\n');
}

function lineasOpcionales(edicion: EdicionDePago, datos: ParaPagar, lineas: readonly LineaDelPago[]): string[] {
  const partes: string[] = [];
  if (edicion.forma === 'cheque' || edicion.forma === 'nota_de_debito') {
    partes.push(`Beneficiario: ${datos.beneficiario ?? ''} (el nombre del NIT del proveedor).`);
  }
  const retencion = retencionDelPago(lineas);
  if (retencion > 0)
    partes.push(`Descuenta ${montoDeCentavos(retencion)} de retención, que ya viene rebajada del saldo.`);
  const saldadas = diferenciasMarcadas(edicion, datos);
  if (saldadas.length > 0) {
    partes.push(
      `Dará por saldada la diferencia de centavos de ${CUANTOS(saldadas.length, 'documento', 'documentos')}.`,
    );
  }
  return partes;
}

const TEXTOS_DEL_BOTON: Record<EdicionDePago['forma'], string> = {
  cheque: 'Registrar el cheque',
  nota_de_debito: 'Registrar el pago',
  nota_ligada: 'Aplicar la nota',
  cuenta_de_apertura: 'Dar por pagado',
};

export const textoDelBoton = (forma: EdicionDePago['forma']): string => TEXTOS_DEL_BOTON[forma];
