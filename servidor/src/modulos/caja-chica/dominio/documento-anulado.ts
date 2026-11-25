import type { Comprobante } from './comprobantes.js';
import {
  ComprobanteSinDocumentoAnulado,
  MontoDeLaSalidaExcedido,
  SalidaDelDocumentoInvalida,
  SituacionDelDocumentoNoPermite,
} from './errores-de-documento-anulado.js';

export type SituacionDelDocumento = 'por_resolver' | 'en_disputa' | 'resuelto';
export type SalidaDelDocumento = 'reemplazo' | 'devolucion' | 'cobro' | 'sin_recuperacion';
export type DestinoDeLaSalida = 'proveedor' | 'custodio';

/** La causa con la que el libro avisa que el emisor anuló la FEL en la SAT. */
export const FEL_ANULADA_POR_EL_EMISOR = 'fel_anulada_por_el_emisor';

/** Los meses que el crédito fiscal puede esperar a la factura de reemplazo (Ley del IVA art. 20). */
const MESES_PARA_LA_DISPUTA = 2;

export interface DisputaDelDocumento {
  motivo: string;
  /** Dónde está la prueba de pago (referencia del cheque, voucher, estado de cuenta…). */
  prueba: string;
  /** Hasta cuándo se puede tomar el crédito si se aclara: la fecha del documento más dos meses. */
  hasta: string;
}

/**
 * En qué va un documento anulado por su emisor (dictamen del 2026-11-24): `por_resolver` y `en_disputa` están
 * pendientes; `resuelto` lleva la salida elegida. El efectivo no cambia en ningún caso: lo gastado ya salió.
 */
export interface SeguimientoDelDocumento {
  situacion: SituacionDelDocumento;
  salida: SalidaDelDocumento | null;
  /** La factura anulada, cuando la salida fue un reemplazo (el comprobante pasó a apuntar a la nueva). */
  documentoAnuladoId: string | null;
  motivoDeLaResolucion: string | null;
  montoCentavos: number | null;
  destino: DestinoDeLaSalida | null;
  disputa: DisputaDelDocumento | null;
}

export const SEGUIMIENTO_POR_RESOLVER: SeguimientoDelDocumento = {
  situacion: 'por_resolver',
  salida: null,
  documentoAnuladoId: null,
  motivoDeLaResolucion: null,
  montoCentavos: null,
  destino: null,
  disputa: null,
};

type ConSeguimiento = Pick<Comprobante, 'motivoDocumentoAnulado' | 'seguimiento'>;

/** Está pendiente: su documento fue anulado por el emisor y aún no se resolvió (ni se reemplazó). */
export const estaPorResolver = ({ seguimiento }: Pick<Comprobante, 'seguimiento'>): boolean =>
  seguimiento !== null && seguimiento.situacion !== 'resuelto';

/**
 * Sin documento vigente que respalde el gasto: anulado y sin reemplazo. No da crédito fiscal ni es deducible. La FEL de
 * reemplazo sí (queda con la nueva).
 */
export const sinRespaldoFiscal = ({ motivoDocumentoAnulado, seguimiento }: ConSeguimiento): boolean =>
  motivoDocumentoAnulado !== null && seguimiento?.salida !== 'reemplazo';

/** La fecha de emisión más dos meses (último día del mes si el destino no tiene ese día). */
export function fechaLimiteDeLaDisputa(fechaDeEmision: string): string {
  const [anio, mes, dia] = fechaDeEmision.split('-').map(Number) as [number, number, number];
  const indice = anio * 12 + (mes - 1) + MESES_PARA_LA_DISPUTA;
  const anioFinal = Math.floor(indice / 12);
  const mesFinal = (indice % 12) + 1;
  const ultimoDia = new Date(Date.UTC(anioFinal, mesFinal, 0)).getUTCDate();
  const texto = (numero: number): string => String(numero).padStart(2, '0');
  return `${anioFinal}-${texto(mesFinal)}-${texto(Math.min(dia, ultimoDia))}`;
}

/** @throws ComprobanteSinDocumentoAnulado */
export function exigirDocumentoAnulado(comprobante: Comprobante): SeguimientoDelDocumento {
  if (comprobante.estado !== 'vigente' || comprobante.seguimiento === null) throw new ComprobanteSinDocumentoAnulado();
  return comprobante.seguimiento;
}

/** Solo lo pendiente se resuelve. @throws ComprobanteSinDocumentoAnulado, SituacionDelDocumentoNoPermite */
export function exigirPendiente(comprobante: Comprobante): SeguimientoDelDocumento {
  const seguimiento = exigirDocumentoAnulado(comprobante);
  if (seguimiento.situacion === 'resuelto') {
    throw new SituacionDelDocumentoNoPermite('El documento anulado ya se resolvió.');
  }
  return seguimiento;
}

/** Pasa a disputa lo que está «por resolver». @throws SituacionDelDocumentoNoPermite */
export function aDisputa(comprobante: Comprobante, por: { motivo: string; prueba: string }): SeguimientoDelDocumento {
  const seguimiento = exigirPendiente(comprobante);
  if (seguimiento.situacion === 'en_disputa') {
    throw new SituacionDelDocumentoNoPermite('El documento anulado ya está en disputa.');
  }
  const emision = comprobante.documento?.fechaEmision ?? comprobante.fecha;
  return { ...seguimiento, situacion: 'en_disputa', disputa: { ...por, hasta: fechaLimiteDeLaDisputa(emision) } };
}

/** Vuelve a «por resolver» lo que está en disputa. @throws SituacionDelDocumentoNoPermite */
export function sinDisputa(comprobante: Comprobante): SeguimientoDelDocumento {
  const seguimiento = exigirPendiente(comprobante);
  if (seguimiento.situacion !== 'en_disputa') {
    throw new SituacionDelDocumentoNoPermite('El documento anulado no está en disputa.');
  }
  return { ...seguimiento, situacion: 'por_resolver', disputa: null };
}

export interface SalidaPedida {
  salida: Exclude<SalidaDelDocumento, 'reemplazo'>;
  motivo: string;
  montoCentavos?: number | null;
  destino?: DestinoDeLaSalida | null;
}

/**
 * Resuelve lo pendiente con devolución, cobro o sin recuperación. La devolución y el cobro piden monto y destino, y el
 * monto no pasa de lo gastado; sin recuperación no lleva ninguno (se pierde todo el gasto).
 * @throws SalidaDelDocumentoInvalida, MontoDeLaSalidaExcedido, SituacionDelDocumentoNoPermite
 */
export function aSalida(comprobante: Comprobante, pedida: SalidaPedida): SeguimientoDelDocumento {
  const seguimiento = exigirPendiente(comprobante);
  const { salida, motivo } = pedida;
  const recupera = salida !== 'sin_recuperacion';
  const montoCentavos = pedida.montoCentavos ?? null;
  const destino = pedida.destino ?? null;
  exigirMontoYDestino({ recupera, montoCentavos, destino });
  if (montoCentavos !== null && montoCentavos > comprobante.montoCentavos) {
    throw new MontoDeLaSalidaExcedido(comprobante.montoCentavos);
  }
  return {
    ...seguimiento,
    situacion: 'resuelto',
    disputa: null,
    salida,
    motivoDeLaResolucion: motivo,
    montoCentavos,
    destino,
  };
}

/** La devolución y el cobro piden monto positivo y destino; sin recuperación no lleva ninguno. */
function exigirMontoYDestino(por: { recupera: boolean; montoCentavos: number | null; destino: string | null }): void {
  const { recupera, montoCentavos, destino } = por;
  if (recupera && (montoCentavos === null || montoCentavos <= 0 || destino === null)) {
    throw new SalidaDelDocumentoInvalida('La devolución y el cobro piden el monto y a quién se le recupera.');
  }
  if (!recupera && (montoCentavos !== null || destino !== null)) {
    throw new SalidaDelDocumentoInvalida('Sin recuperación no lleva monto ni destino.');
  }
}

/** El seguimiento tras reemplazar la factura anulada por otra FEL. */
export function aReemplazo(
  comprobante: Comprobante,
  por: { motivo: string; documentoAnuladoId: string },
): SeguimientoDelDocumento {
  const seguimiento = exigirPendiente(comprobante);
  return {
    ...seguimiento,
    situacion: 'resuelto',
    disputa: null,
    salida: 'reemplazo',
    documentoAnuladoId: por.documentoAnuladoId,
    motivoDeLaResolucion: por.motivo,
  };
}
