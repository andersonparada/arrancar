import { formatearFecha, formatearMonto } from '@/modulos/core/utilidades/formato';
import type {
  Comprobante,
  ComprobanteDeLaBandeja,
  EstadoDeLosComprobantes,
  ListaDeComprobantes,
  SalidaDelDocumento,
  VistaDeComprobantes,
} from '../../servicios/tipos-de-comprobantes';
import { tituloDeComprobante } from '../comprobantes/detalles-de-comprobante';
import { fechaDeHoy } from '../reportes/fechas-de-reportes';

type Tono = 'campo' | 'trigo' | 'tierra' | 'rojo';

/** Cómo se llama cada salida y qué significa, tal como se le explica al operador. */
export const TEXTOS_DE_SALIDA: Record<SalidaDelDocumento, { texto: string; ayuda: string }> = {
  reemplazo: {
    texto: 'El emisor dio otra factura (FEL) por el mismo gasto',
    ayuda: 'La factura nueva ocupa su lugar con el mismo monto; el fondo, el vale y la reposición no cambian.',
  },
  devolucion: {
    texto: 'Me devolvieron el dinero',
    ayuda: 'El proveedor regresó lo pagado, todo o una parte.',
  },
  cobro: {
    texto: 'Se le va a cobrar el dinero',
    ayuda: 'Queda por cobrar al proveedor o al custodio.',
  },
  sin_recuperacion: {
    texto: 'No se recupera',
    ayuda: 'Se pierde el gasto: queda sin crédito fiscal y no deducible.',
  },
};

/** El documento fue anulado por su emisor y todavía hay algo que resolver (por resolver o en disputa). */
export const estaPendiente = (comprobante: Comprobante): boolean =>
  comprobante.estado === 'vigente' &&
  comprobante.seguimiento !== null &&
  comprobante.seguimiento.situacion !== 'resuelto';

/** Cuántos comprobantes de la lista tienen un documento anulado sin resolver. */
export const cuantosPendientes = (comprobantes: readonly Comprobante[]): number =>
  comprobantes.filter(estaPendiente).length;

/** Lo que se muestra del documento anulado: una insignia y las líneas que explican en qué va. */
export interface EstadoVisible {
  texto: string;
  tono: Tono;
  lineas: string[];
}

const SIN_CREDITO =
  'Sin factura vigente no hay crédito fiscal y el gasto no es deducible. El efectivo del fondo no cambia.';

function dePendiente(comprobante: Comprobante, hoy: string): EstadoVisible | null {
  const seguimiento = comprobante.seguimiento;
  if (!seguimiento) return null;
  const motivo = `La FEL fue anulada por su emisor: ${comprobante.motivoDocumentoAnulado ?? '—'}`;
  if (seguimiento.situacion === 'por_resolver') {
    return { texto: 'Factura anulada · por resolver', tono: 'rojo', lineas: [motivo, SIN_CREDITO] };
  }
  const disputa = seguimiento.disputa;
  const lineas = [motivo];
  if (disputa) {
    lineas.push(`Disputa: ${disputa.motivo}`, `Prueba de pago: ${disputa.prueba}`);
    lineas.push(
      disputa.hasta < hoy
        ? `El plazo para tomar el crédito venció el ${formatearFecha(disputa.hasta)}: resuélvalo con devolución, cobro o sin recuperación.`
        : `Si se aclara a favor, el crédito se puede tomar hasta el ${formatearFecha(disputa.hasta)}. Mientras tanto no se toma.`,
    );
  }
  return { texto: 'Factura anulada · en disputa', tono: 'trigo', lineas };
}

function deResuelto(comprobante: Comprobante): EstadoVisible | null {
  const seguimiento = comprobante.seguimiento;
  if (!seguimiento || seguimiento.salida === null) return null;
  const cantidad = seguimiento.monto === null ? '' : formatearMonto(seguimiento.monto);
  const destino = seguimiento.destino === 'custodio' ? 'del custodio' : 'del proveedor';
  const detalle: Record<SalidaDelDocumento, string> = {
    reemplazo: 'Una factura nueva ocupó su lugar.',
    devolucion: `Devolución de ${cantidad} ${destino}.`,
    cobro: `Por cobrar ${cantidad} ${destino}.`,
    sin_recuperacion: 'No se recupera: gasto no deducible.',
  };
  const lineas = [detalle[seguimiento.salida]];
  if (seguimiento.motivoDeLaResolucion) lineas.push(`Motivo: ${seguimiento.motivoDeLaResolucion}`);
  return { texto: 'Factura anulada · resuelta', tono: 'campo', lineas };
}

/** En qué va el documento anulado; `null` si el comprobante no tiene uno. */
export function estadoDelDocumento(comprobante: Comprobante, hoy: string = fechaDeHoy()): EstadoVisible | null {
  if (comprobante.seguimiento?.situacion === 'resuelto') return deResuelto(comprobante);
  return dePendiente(comprobante, hoy);
}

/**
 * Las facturas de la bandeja que pueden reemplazar a la anulada: del mismo proveedor, del mismo monto y clase, y dentro
 * del libro. Es una ayuda para escoger; el servidor vuelve a validar.
 */
export function candidatosDeReemplazo(
  anulado: Comprobante,
  bandeja: readonly ComprobanteDeLaBandeja[],
): ComprobanteDeLaBandeja[] {
  return bandeja.filter(
    (nuevo) =>
      nuevo.id !== anulado.id &&
      nuevo.clase === 'documento' &&
      nuevo.proveedorId === anulado.proveedorId &&
      nuevo.esNotaDeCredito === anulado.esNotaDeCredito &&
      nuevo.monto === anulado.monto &&
      nuevo.documento?.enElLibro === true,
  );
}

/** «Por resolver» no existe en el servidor: se piden todos y se dejan los pendientes. */
export const estadoParaElServidor = (vista: VistaDeComprobantes): EstadoDeLosComprobantes =>
  vista === 'por_resolver' ? 'todos' : vista;

export function filtrarPorVista(lista: ListaDeComprobantes, vista: VistaDeComprobantes): ListaDeComprobantes {
  return vista === 'por_resolver' ? { ...lista, elementos: lista.elementos.filter(estaPendiente) } : lista;
}

/** Las facturas candidatas como opciones de un selector, por fecha y número. */
export const opcionesDeReemplazo = (candidatos: readonly ComprobanteDeLaBandeja[]) =>
  candidatos.map((nuevo) => ({
    valor: nuevo.id,
    texto: `${tituloDeComprobante(nuevo)} · ${formatearFecha(nuevo.fecha)} · ${formatearMonto(nuevo.monto)}`,
  }));
