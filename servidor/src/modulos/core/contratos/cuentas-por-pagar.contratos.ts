import type { DocumentoParaDestino, TipoDeDocumentoDeCompra } from './libro-de-compras.contratos.js';

/**
 * Órdenes y eventos de `cuentas-por-pagar` (ver `mediador.contratos.ts`). Por ahora la orden que llama Libro de compras
 * al registrar un documento y el evento de después de anular uno.
 */
declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /**
     * Recibe el documento registrado en el libro, dentro de su misma transacción; si lanza, no se registra nada.
     * Responde los avisos que no bloquean (por ejemplo, una nota de crédito que deja saldo a favor de la empresa), que
     * Libro de compras suma a los suyos.
     */
    'cuentas-por-pagar.recibir_documento': { datos: DocumentoParaDestino; respuesta: { avisos: string[] } };
  }
}

/** Eventos de después de confirmar, para Contabilidad y quien quiera escucharlos. */
declare module '../eventos/bus-eventos.js' {
  interface EventosDominio {
    /**
     * Un documento por pagar quedó aprobado para pago (U12: autorizar no provisiona; el pasivo y el gasto se registran al
     * registrar el documento en Libro de compras). `documentoId` es el de Cuentas por pagar y `documentoDeCompraId` el de
     * Libro de compras (nulo en un saldo inicial); el dinero va en centavos enteros. Con `origen = 'saldo_inicial'`
     * no genera partida: el pasivo de apertura lo contabiliza la carga inicial con la fecha del corte (y la cuenta
     * puente).
     */
    'cuentas-por-pagar.documento_autorizado': {
      empresaId: string;
      documentoId: string;
      documentoDeCompraId: string | null;
      origen: 'libro_de_compras' | 'saldo_inicial';
      tipo: TipoDeDocumentoDeCompra;
      proveedorId: string;
      totalCentavos: number;
      retencionesCentavos: number;
      /** Autorizó quien también lo ingresó o lo completó (con el permiso `autorizar-propios`). */
      autorizacionPropia: boolean;
    };
    /** Un documento autorizado volvió a «completado» (mientras no tenga pagos): ya no está aprobado para pago. Con `origen = 'saldo_inicial'` no genera partida. */
    'cuentas-por-pagar.documento_desautorizado': {
      empresaId: string;
      documentoId: string;
      documentoDeCompraId: string | null;
      origen: 'libro_de_compras' | 'saldo_inicial';
    };
    /**
     * Un documento por pagar quedó anulado. `estabaAutorizado`: ya estaba aprobado para pago. `documentoId` es el de
     * Cuentas por pagar y `documentoDeCompraId` el de Libro de compras. Nunca sale de un saldo inicial (no se anula).
     */
    'cuentas-por-pagar.documento_anulado': {
      empresaId: string;
      documentoId: string;
      documentoDeCompraId: string | null;
      origen: 'libro_de_compras' | 'saldo_inicial';
      estabaAutorizado: boolean;
    };
  }
}

export {};
