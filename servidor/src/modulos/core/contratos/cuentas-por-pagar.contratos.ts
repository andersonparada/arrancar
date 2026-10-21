import type { DocumentoParaDestino } from './libro-de-compras.contratos.js';

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
     * Un documento por pagar quedó anulado. `estabaAutorizado`: ya estaba provisionado, así que Contabilidad revierte la
     * provisión. `documentoId` es el de Cuentas por pagar y `documentoDeCompraId` el de Libro de compras.
     */
    'cuentas-por-pagar.documento_anulado': {
      empresaId: string;
      documentoId: string;
      documentoDeCompraId: string;
      estabaAutorizado: boolean;
    };
  }
}

export {};
