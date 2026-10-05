/**
 * Órdenes y avisos de `libro-de-compras` (ver `mediador.contratos.ts`). Las órdenes las llaman los módulos de
 * destino (Cuentas por pagar, Caja chica…) desde sus pantallas; Libro de compras las atiende (L3-6) con las mismas
 * reglas que su propia pantalla. Los avisos son suyos: corren dentro de la transacción de quien avisa. Los eventos
 * de después de confirmar van al bus; el dinero siempre viaja en centavos enteros.
 */

/** Los módulos a donde puede ir un documento del libro. */
export type DestinoDeDocumento = 'cuentas-por-pagar' | 'caja-chica' | 'cuentas-por-liquidar';

export type TipoDeDocumentoDeCompra = 'factura' | 'factura_pequeno_contribuyente' | 'nota_de_credito';

/** Lo que recibe cada destino en su orden `<destino>.recibir_documento`. */
export interface DocumentoParaDestino {
  documentoId: string;
  tipo: TipoDeDocumentoDeCompra;
  proveedorId: string;
  /** La factura que corrige, solo en las notas de crédito. */
  documentoAfectadoId: string | null;
  /** `AAAA-MM-DD`. */
  fechaEmision: string;
  totalCentavos: number;
  retencionesCentavos: number;
  tieneActivoFijo: boolean;
}

declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /** El destino fecha la retención del 5 % a pequeño contribuyente (al autorizar o pagar). `fecha` es `AAAA-MM-DD`. */
    'libro-de-compras.fechar_retencion': { datos: { documentoId: string; fecha: string }; respuesta: void };
    /** El destino marca el documento como procesado (`true`) o lo devuelve a pendiente (`false`). */
    'libro-de-compras.marcar_procesado': { datos: { documentoId: string; procesado: boolean }; respuesta: void };
    /** El destino anula o elimina desde su pantalla; Libro de compras aplica sus reglas. */
    'libro-de-compras.anular_documento': { datos: { documentoId: string; motivo: string }; respuesta: void };
    'libro-de-compras.eliminar_documento': { datos: { documentoId: string }; respuesta: void };
  }
  interface AvisosEntreModulos {
    /** Antes de anular: el destino revierte lo suyo o lanza su error (se deshace todo). Su manejador es idempotente. */
    'libro-de-compras.documento_por_anular': { documentoId: string; destino: DestinoDeDocumento; motivo: string };
    /** Antes de eliminar: igual que el de anular. */
    'libro-de-compras.documento_por_eliminar': { documentoId: string; destino: DestinoDeDocumento };
  }
}

/** Eventos de después de confirmar, para Contabilidad y quien quiera escucharlos. */
declare module '../eventos/bus-eventos.js' {
  interface EventosDominio {
    'libro-de-compras.documento_registrado': DocumentoParaDestino & {
      empresaId: string;
      destino: DestinoDeDocumento;
    };
    'libro-de-compras.documento_anulado': { documentoId: string; empresaId: string; destino: DestinoDeDocumento };
    'libro-de-compras.documento_eliminado': { documentoId: string; empresaId: string; destino: DestinoDeDocumento };
  }
}

export {};
