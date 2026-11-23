/**
 * Órdenes, avisos y eventos de `libro-de-ventas` (ver `mediador.contratos.ts`; diseño en
 * `docs/modulos/diseno-cuentas-por-cobrar-y-ventas.md` §10). Las órdenes las llaman los módulos de destino (Cuentas por
 * cobrar) desde sus pantallas; los avisos son de Libro de ventas y corren dentro de la transacción de quien avisa. Los
 * eventos de después de confirmar van al bus; el dinero siempre viaja en centavos enteros.
 */

/** Los módulos a donde puede ir un documento del libro de ventas; sin destino, el documento no es cartera. */
export type DestinoDeDocumentoDeVenta = 'cuentas-por-cobrar';

/** Qué papel hace el documento en la deuda del cliente: la factura y la nota de débito la suben; las notas de crédito y de abono la bajan. */
export type ClaseDeDocumentoDeVenta = 'cargo' | 'abono';

export type TipoDeDocumentoDeVenta =
  | 'factura'
  | 'factura_cambiaria'
  | 'factura_pequeno_contribuyente'
  | 'factura_pequeno_contribuyente_electronico'
  | 'factura_contribuyente_agropecuario'
  | 'factura_primario_pecuario'
  | 'factura_especial_recibida'
  | 'nota_de_credito'
  | 'nota_de_debito'
  | 'nota_de_abono'
  | 'recibo';

/** Por qué se anula un documento de venta. */
export type CausaDeAnulacionDeVenta = 'fel_anulada_en_la_sat' | 'error_de_captura' | 'no_corresponde_a_la_empresa';

/** La factura del sistema anterior que corrige una nota (no está en el libro de Arrancar). */
export interface FacturaAnteriorDeLaNotaDeVenta {
  serie: string | null;
  numero: string;
  /** `AAAA-MM-DD`. */
  fecha: string;
}

/** Lo que recibe la cartera en su orden `cuentas-por-cobrar.recibir_documento`. */
export interface DocumentoDeVentaParaDestino {
  documentoId: string;
  tipo: TipoDeDocumentoDeVenta;
  clase: ClaseDeDocumentoDeVenta;
  clienteId: string;
  /** La factura que corrige, en las notas. */
  documentoAfectadoId: string | null;
  facturaAnterior: FacturaAnteriorDeLaNotaDeVenta | null;
  /** `AAAA-MM-DD`. */
  fechaEmision: string;
  totalCentavos: number;
  moneda: string;
  /** Alguna línea es venta de un activo fijo (concepto de sistema). */
  tieneVentaDeActivo: boolean;
}

declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /** El destino marca el documento como procesado (`true`) o lo devuelve a pendiente (`false`). */
    'libro-de-ventas.marcar_procesado': { datos: { documentoId: string; procesado: boolean }; respuesta: void };
  }
  interface AvisosEntreModulos {
    /** Antes de anular: el destino revierte lo suyo o lanza su error (se deshace todo). Su manejador es idempotente. */
    'libro-de-ventas.documento_por_anular': {
      documentoId: string;
      destino: DestinoDeDocumentoDeVenta;
      motivo: string;
    };
    /** Antes de eliminar: igual que el de anular. */
    'libro-de-ventas.documento_por_eliminar': { documentoId: string; destino: DestinoDeDocumentoDeVenta };
  }
}

/** Una línea del documento registrado, para Contabilidad. */
export interface LineaDeVentaRegistrada {
  conceptoDeIngresoId: string;
  claseFiscal: 'gravada' | 'exenta' | 'exportacion' | 'no_afecta';
  baseCentavos: number;
  ivaCentavos: number;
}

/** Eventos de después de confirmar, para Contabilidad y quien quiera escucharlos. */
declare module '../eventos/bus-eventos.js' {
  interface EventosDominio {
    'libro-de-ventas.documento_registrado': {
      documentoId: string;
      empresaId: string;
      tipo: TipoDeDocumentoDeVenta;
      clienteId: string | null;
      /** Primer día del mes. */
      periodo: string;
      fechaEmision: string;
      totalCentavos: number;
      moneda: string;
      destino: DestinoDeDocumentoDeVenta | null;
      lineas: LineaDeVentaRegistrada[];
    };
    'libro-de-ventas.documento_anulado': {
      documentoId: string;
      empresaId: string;
      destino: DestinoDeDocumentoDeVenta | null;
      fechaDeAnulacion: string;
    };
    'libro-de-ventas.documento_eliminado': {
      documentoId: string;
      empresaId: string;
      destino: DestinoDeDocumentoDeVenta | null;
    };
  }
}

export {};
