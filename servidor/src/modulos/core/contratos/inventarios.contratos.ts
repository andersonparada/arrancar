/**
 * Eventos de `inventarios` (ver `docs/modulos/diseno-inventarios.md` §9), de después de confirmar, para la futura
 * Contabilidad y quien quiera escucharlos. El dinero va en centavos enteros (quetzales) y las cantidades como texto con
 * 4 decimales en la unidad base del artículo. Los de este paso: recepciones, devoluciones, rebajas, entradas manuales,
 * salidas por consumo, anulaciones y recálculos; los de traslados, ajustes y cierres llegan con sus pasos.
 */
type TipoDeInventario = string;

interface RenglonDeEvento {
  movimientoId: string;
  articuloId: string;
  tipoDeInventario: TipoDeInventario;
  cantidad: string;
  costoCentavos: number;
  /** La línea del Libro de compras de donde viene (recepciones, devoluciones y rebajas). */
  lineaDeCompraId?: string | null;
}

interface DatosComunes {
  empresaId: string;
  documentoId: string;
  clase: string;
  numero: number;
  fecha: string;
  /** Nula en la rebaja de costo, que es de solo valor. */
  bodegaId: string | null;
  renglones: RenglonDeEvento[];
}

declare module '../eventos/bus-eventos.js' {
  interface EventosDominio {
    /**
     * Entró mercadería: una recepción de una factura del libro (`documentoDeCompraId` y `causa = 'compra'`) o una
     * entrada manual.
     */
    'inventarios.entrada_registrada': DatosComunes & {
      documentoDeCompraId: string | null;
      causa: string;
      /** Con `donacion_recibida`: el costo escrito, que Contabilidad abona a ingresos (V-10). */
      valorRazonableCentavos: number | null;
    };
    /** Se devolvió mercadería al proveedor, respaldada por una nota de crédito del libro. */
    'inventarios.devolucion_a_proveedor': DatosComunes & {
      documentoDeCompraId: string;
      /** Las entradas de recepciones de las que sale la mercadería devuelta. */
      entradasDevueltas: string[];
    };
    /**
     * Una nota de crédito rebajó el costo de entradas ya recibidas. `absorbidoCentavos` es lo que baja el valor de la
     * existencia y `aResultadosCentavos` lo que va a resultados (costo de ventas o gasto de lo ya salido); los dos con
     * signo, en negativo.
     */
    'inventarios.costo_ajustado': DatosComunes & {
      documentoDeCompraId: string;
      repartos: { movimientoDeEntradaId: string; absorbidoCentavos: number; aResultadosCentavos: number }[];
    };
    /** Salió mercadería por consumo, con su destino. */
    'inventarios.salida_registrada': DatosComunes & {
      destino: string;
      conceptoDeGastoId: string | null;
      localidadId: string | null;
      departamentoId: string | null;
      activoFijoId: string | null;
    };
    /** Se anuló un documento (Contabilidad revierte lo suyo). */
    'inventarios.documento_anulado': { empresaId: string; documentoId: string; clase: string; numero: number };
    /** El costo de salidas anteriores cambió por un movimiento con fecha anterior o una anulación. */
    'inventarios.costo_recalculado': {
      empresaId: string;
      causa: string;
      documentoId: string;
      diferencias: { movimientoId: string; documentoId: string; diferenciaCentavos: number }[];
      repartos: {
        documentoId: string;
        movimientoDeEntradaId: string;
        diferenciaAbsorbidoCentavos: number;
        diferenciaAResultadosCentavos: number;
      }[];
    };
  }
}

export {};
