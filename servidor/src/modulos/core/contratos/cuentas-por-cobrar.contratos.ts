import type { DocumentoDeVentaParaDestino } from './libro-de-ventas.contratos.js';

/**
 * Órdenes de `cuentas-por-cobrar` (ver `mediador.contratos.ts`). Por ahora, la que llama Libro de ventas al registrar
 * un documento que va a la cartera; el módulo que la atiende llega en CXC-1
 * (`docs/modulos/diseno-cuentas-por-cobrar-y-ventas.md` §10.1).
 */
declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /**
     * Recibe el documento registrado en el libro de ventas, dentro de su misma transacción; si lanza, no se registra
     * nada. Responde los avisos que no bloquean, que Libro de ventas suma a los suyos.
     */
    'cuentas-por-cobrar.recibir_documento': { datos: DocumentoDeVentaParaDestino; respuesta: { avisos: string[] } };
  }
}

export {};
