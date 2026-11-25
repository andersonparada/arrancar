import { textoONulo } from '@/modulos/core/utilidades/edicion';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  Comprobante,
  DestinoDeLaSalida,
  DisputaSolicitada,
  SalidaDelDocumento,
  SalidaSolicitada,
} from '../../servicios/tipos-de-comprobantes';
import { centavosDe } from '../dinero';
import { tituloDeComprobante } from '../comprobantes/detalles-de-comprobante';

/** Lo que se escribe al resolver un documento anulado por su emisor. */
export interface EdicionDeSalida {
  salida: SalidaDelDocumento | null;
  /** La factura nueva de la bandeja, si la salida es el reemplazo. */
  reemplazoId: string | null;
  monto: string | number;
  destino: DestinoDeLaSalida | null;
  motivo: string;
}

/** El monto empieza siendo todo lo gastado: lo más común es recuperarlo completo. */
export const edicionDeSalida = (comprobante: Comprobante | null): EdicionDeSalida => ({
  salida: null,
  reemplazoId: null,
  monto: comprobante?.monto ?? '',
  destino: null,
  motivo: '',
});

export const DESTINOS_DE_LA_SALIDA: { valor: DestinoDeLaSalida; texto: string }[] = [
  { valor: 'proveedor', texto: 'El proveedor' },
  { valor: 'custodio', texto: 'El custodio del fondo' },
];

const pideMonto = (salida: SalidaDelDocumento | null): boolean => salida === 'devolucion' || salida === 'cobro';

function faltasDelMonto(edicion: EdicionDeSalida, maximo: string): Record<string, string> {
  const centavos = centavosDe(edicion.monto);
  if (centavos === null || centavos <= 0) {
    return { monto: 'Escriba cuánto se recupera, mayor que cero y con hasta dos decimales.' };
  }
  if (centavos > (centavosDe(maximo) ?? 0)) {
    return { monto: `No puede pasar de lo gastado (${formatearMonto(maximo)}): si es más, es otro gasto.` };
  }
  return edicion.destino ? {} : { destino: 'Diga a quién se le recupera: al proveedor o al custodio.' };
}

/** Lo que falta escribir antes de enviar, por campo, con cómo corregirlo. */
export function faltaDeSalida(edicion: EdicionDeSalida, comprobante: Comprobante): Record<string, string> {
  const faltas: Record<string, string> = {};
  if (!edicion.salida) return { salida: 'Escoja cómo se resuelve este documento anulado.' };
  if (edicion.salida === 'reemplazo' && !edicion.reemplazoId) {
    faltas.reemplazoId =
      'Escoja la factura nueva. Si no aparece, regístrela en Libro de compras con destino Caja chica.';
  }
  if (pideMonto(edicion.salida)) Object.assign(faltas, faltasDelMonto(edicion, comprobante.monto));
  if (!edicion.motivo.trim()) faltas.motivo = 'Escriba el motivo: queda registrado en la auditoría.';
  return faltas;
}

/** Lo que se envía para la devolución, el cobro y «no se recupera». */
export function cuerpoDeSalida(edicion: EdicionDeSalida): SalidaSolicitada {
  const salida = edicion.salida === 'cobro' || edicion.salida === 'devolucion' ? edicion.salida : 'sin_recuperacion';
  const recupera = salida !== 'sin_recuperacion';
  return {
    salida,
    motivo: edicion.motivo.trim(),
    monto: recupera ? textoONulo(edicion.monto) : null,
    destino: recupera ? edicion.destino : null,
  };
}

/** Qué va a pasar si confirma, para decirlo antes de enviar. */
export function resumenDeSalida(comprobante: Comprobante, edicion: EdicionDeSalida): string {
  const titulo = tituloDeComprobante(comprobante);
  const intacto = 'El efectivo del fondo, el vale y la reposición no cambian.';
  const destino = edicion.destino === 'custodio' ? 'al custodio' : 'al proveedor';
  switch (edicion.salida) {
    case 'reemplazo':
      return `${titulo} pasa a apuntar a la factura nueva y la anulada queda en su historial. ${intacto} El crédito fiscal se toma con la fecha de la factura nueva.`;
    case 'devolucion':
      return `Se anota que ${formatearMonto(edicion.monto || '0')} vuelven del gasto ${titulo}. ${intacto}`;
    case 'cobro':
      return `Se anota que quedan por cobrar ${formatearMonto(edicion.monto || '0')} ${destino} por ${titulo}. ${intacto}`;
    case 'sin_recuperacion':
      return `Se pierde todo el gasto de ${titulo}: queda como gasto no deducible y sin crédito fiscal. ${intacto}`;
    default:
      return `Escoja cómo se resuelve ${titulo}. Mientras no se resuelva no da crédito fiscal ni es deducible.`;
  }
}

/** Lo que se escribe al decir «no reconocemos la anulación»: el motivo y dónde está la prueba de pago. */
export interface EdicionDeDisputa {
  motivo: string;
  prueba: string;
}

export const edicionDeDisputa = (): EdicionDeDisputa => ({ motivo: '', prueba: '' });

export function faltaDeDisputa(edicion: EdicionDeDisputa): Record<string, string> {
  const faltas: Record<string, string> = {};
  if (!edicion.motivo.trim()) faltas.motivo = 'Escriba por qué no se reconoce la anulación.';
  if (!edicion.prueba.trim()) {
    faltas.prueba = 'Diga dónde está la prueba de pago: cheque, voucher o estado de cuenta.';
  }
  return faltas;
}

export const cuerpoDeDisputa = (edicion: EdicionDeDisputa): DisputaSolicitada => ({
  motivo: edicion.motivo.trim(),
  prueba: edicion.prueba.trim(),
});
