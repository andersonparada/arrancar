import type { DocumentoParaDestino } from './libro-de-compras.contratos.js';

/**
 * Órdenes de `cuentas-por-pagar` (ver `mediador.contratos.ts`). Por ahora solo la que llama Libro de compras al
 * registrar un documento; el módulo que la atiende llega con CP1.
 */
declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /** Recibe el documento registrado en el libro, dentro de su misma transacción; si lanza, no se registra nada. */
    'cuentas-por-pagar.recibir_documento': { datos: DocumentoParaDestino; respuesta: void };
  }
}

export {};
