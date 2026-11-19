/**
 * Eventos de `inventarios` (ver `docs/modulos/diseno-inventarios.md` §9), de después de confirmar, para la futura
 * Contabilidad y quien quiera escucharlos. El dinero va en centavos enteros (quetzales) y las cantidades como texto con
 * 4 decimales en la unidad base del artículo. Los de este paso: entradas manuales, salidas por consumo, anulaciones y
 * recálculos; los de recepciones, traslados, ajustes y cierres llegan con sus pasos.
 */
type TipoDeInventario = string;

interface RenglonDeEvento {
  movimientoId: string;
  articuloId: string;
  tipoDeInventario: TipoDeInventario;
  cantidad: string;
  costoCentavos: number;
}

interface DatosComunes {
  empresaId: string;
  documentoId: string;
  clase: string;
  numero: number;
  fecha: string;
  bodegaId: string;
  renglones: RenglonDeEvento[];
}

declare module '../eventos/bus-eventos.js' {
  interface EventosDominio {
    /** Entró mercadería sin pasar por el libro (entrada manual). */
    'inventarios.entrada_registrada': DatosComunes & {
      documentoDeCompraId: string | null;
      causa: string;
      /** Con `donacion_recibida`: el costo escrito, que Contabilidad abona a ingresos (V-10). */
      valorRazonableCentavos: number | null;
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
