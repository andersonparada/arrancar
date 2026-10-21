import type { DatosFiscalesPedidos } from '../../../dominio/datos-fiscales-del-documento.js';
import type { DestinoDeDocumento } from '../../../dominio/destinos-de-documento.js';
import type { DteRecibido } from '../../../dominio/dte-recibido.js';
import { ExentoNegativoDelDte } from '../../../dominio/errores-de-bandeja.js';
import { montosPropuestosDelDte, montosSinDeducir, type MontosPropuestos } from '../../../dominio/montos-del-dte.js';
import { FAMILIA_DEL_TIPO_DTE } from '../../../dominio/tipos-de-documento.js';
import type { SolicitudDeLinea, SolicitudSinResolver } from '../../dto/solicitud-de-documento.js';

/** Queda en las observaciones del documento: sus montos salieron del resumen de la SAT y no del detalle de la factura. */
export const MARCA_DE_MONTOS_DE_LA_SAT = 'Montos del resumen de la SAT (una sola línea).';

/** Lo que se decidió de la fila: lo completado o, si falta, la propuesta. `null` es «falta». */
export interface DecisionesDelDte {
  proveedorId: string | null;
  conceptoId: string | null;
  destino: DestinoDeDocumento | null;
  /** `null`: la propone el registro (hoy; solo en un documento que no es de la bandeja). */
  fechaRecepcion: string | null;
  /** `null`: el período de siempre. */
  periodo: string | null;
  datosFiscales: DatosFiscalesPedidos | null;
  /** Tasa del IVA en centésimas (12 % → 1200). */
  tasaDeIva: number;
}

/** La solicitud armada con el DTE; el proveedor, el concepto y el destino pueden faltar si el usuario aún no los escoge. */
export type SolicitudDesdeElDte = Omit<SolicitudSinResolver, 'proveedorId' | 'destino' | 'lineas'> & {
  proveedorId: string | null;
  destino: DestinoDeDocumento | null;
  lineas: Array<Omit<SolicitudDeLinea, 'conceptoId'> & { conceptoId: string | null }>;
};

export interface SolicitudConAvisos {
  solicitud: SolicitudDesdeElDte;
  /** Los avisos de lo que se dedujo del resumen de la SAT. */
  avisos: string[];
}

/** Los montos de la línea; en el formulario, un IVA que no cuadra con el total deja los montos sin deducir y lo avisa. */
function montosDe(dte: DteRecibido, tasaDeIva: number, tolerante: boolean): MontosPropuestos {
  try {
    return montosPropuestosDelDte(dte.instantanea(), tasaDeIva);
  } catch (error) {
    if (!tolerante || !(error instanceof ExentoNegativoDelDte)) throw error;
    return montosSinDeducir(dte.instantanea(), error.message);
  }
}

type LineaDesdeElDte = SolicitudDesdeElDte['lineas'][number];

/** Una sola línea con el total del DTE, su IDP y sus otros impuestos, y el exento deducido. */
function lineaDelDte(dte: DteRecibido, conceptoId: string | null, montos: MontosPropuestos): LineaDesdeElDte {
  return {
    conceptoId,
    descripcion: null,
    tipo: montos.idp ? 'bien' : null,
    esActivoFijo: null,
    combustibleId: null,
    galones: null,
    total: dte.instantanea().total,
    exento: montos.exento,
    otrosImpuestos: montos.otrosImpuestos,
    idpEscrito: montos.idp,
  };
}

/** Los datos del DTE tal cual: quién lo emitió, qué es y cuándo. */
function datosDelDocumento(dte: DteRecibido) {
  const d = dte.instantanea();
  return {
    tipoDte: d.tipoDte,
    nitEmisor: d.nitEmisor,
    serie: d.serie,
    numero: d.numero,
    autorizacionFel: d.autorizacionFel,
    nitReceptor: d.nitReceptor,
    motivoFueraDelLibro: FAMILIA_DEL_TIPO_DTE[d.tipoDte] === 'recibo' ? ('recibo_fel' as const) : null,
    fechaEmision: d.fechaEmision,
    noVinculado: d.noVinculado,
    documentoAfectadoId: d.documentoAfectadoId,
  };
}

/**
 * La solicitud de registro de una fila de la bandeja (`documentoDesdeElDte`): los datos del DTE, lo completado y una sola
 * línea con el total, el IDP y los otros impuestos del DTE y el exento deducido (ver `montosPropuestosDelDte`). Un recibo
 * `RECI`/`RDON` va con el motivo `recibo_fel`.
 * @throws ExentoNegativoDelDte si el IVA del DTE es mayor que el que corresponde a su total y no es `tolerante`.
 */
export function solicitudDesdeElDte(
  dte: DteRecibido,
  decisiones: DecisionesDelDte,
  opciones: { tolerante: boolean },
): SolicitudConAvisos {
  const montos = montosDe(dte, decisiones.tasaDeIva, opciones.tolerante);
  const solicitud: SolicitudDesdeElDte = {
    ...datosDelDocumento(dte),
    proveedorId: decisiones.proveedorId,
    destino: decisiones.destino,
    fechaRecepcion: decisiones.fechaRecepcion,
    periodo: decisiones.periodo,
    ivaDeLaFel: montos.ivaDeLaFel,
    observaciones: MARCA_DE_MONTOS_DE_LA_SAT,
    lineas: [lineaDelDte(dte, decisiones.conceptoId, montos)],
    ajustesDeRetenciones: [],
    datosFiscalesDelProveedor: decisiones.datosFiscales,
    confirmarCambioDeRegimen: false,
  };
  return { solicitud, avisos: montos.avisos };
}
