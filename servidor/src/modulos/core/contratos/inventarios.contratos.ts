/**
 * Eventos de `inventarios` (ver `docs/modulos/diseno-inventarios.md` §9), de después de confirmar, para la futura
 * Contabilidad y quien quiera escucharlos. El dinero va en centavos enteros (quetzales) y las cantidades como texto con
 * 4 decimales en la unidad base del artículo. Los de este paso: recepciones, devoluciones, rebajas, entradas manuales,
 * salidas por consumo, traslados, anulaciones, recálculos y cierres de mes; los de ajustes llegan con su paso.
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
    /**
     * Salió mercadería de una bodega hacia otra de la misma empresa, o llegó a ella. Informativo y **sin dinero**: el
     * traslado es neutro para el costeo (no cambia el costo ni el valor del artículo). `documentoId` es el de la salida;
     * `enTransito` si salió y todavía no se recibió; `recibido` si ya entró al destino (el traslado sin tránsito nace
     * recibido).
     */
    'inventarios.traslado_registrado': {
      empresaId: string;
      documentoId: string;
      numero: number;
      fecha: string;
      bodegaDeOrigenId: string;
      bodegaDeDestinoId: string;
      enTransito: boolean;
      recibido: boolean;
      renglones: { articuloId: string; tipoDeInventario: TipoDeInventario; cantidad: string }[];
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
    /**
     * Se cerró un mes del inventario: sus existencias valuadas quedaron congeladas. Contabilidad puede cuadrar contra
     * `valorTotalCentavos` y `porTipo` (centavos de quetzal). `periodo` es `aaaa-mm-01`.
     */
    'inventarios.mes_cerrado': DatosDelMes;
    /** Se reabrió el último mes cerrado (con motivo): la foto del mes dejó de valer. */
    'inventarios.mes_reabierto': DatosDelMes;
  }
}

/** Un mes del inventario con su valor y el valor por tipo de inventario. */
interface DatosDelMes {
  empresaId: string;
  periodo: string;
  valorTotalCentavos: number;
  porTipo: { tipoDeInventario: TipoDeInventario; valorCentavos: number }[];
}

/** Un hallazgo que otro módulo reporta al revisar el cierre de un mes del inventario. */
export interface HallazgoDeOtroModuloEnElCierre {
  /** Código propio del módulo que lo dice. */
  codigo: string;
  /** `bloquea` impide cerrar el mes; `aviso` solo informa. */
  nivel: 'bloquea' | 'aviso';
  /** Texto final, ya armado por el módulo. */
  mensaje: string;
}

declare module './mediador.contratos.js' {
  interface PreguntasEntreModulos {
    /**
     * Antes de cerrar un mes del inventario, Inventarios pregunta a los demás módulos activos qué saben que afecte
     * ese cierre (por ejemplo, materiales que salieron hacia una obra y no se han capitalizado). `periodo` es
     * `aaaa-mm-01`; el operador lleva la empresa del cierre. Quien no tiene nada que decir responde `null`.
     */
    'inventarios.revisar_cierre_del_mes': {
      datos: { empresaId: string; periodo: string };
      respuesta: { nombreDelModulo: string; hallazgos: HallazgoDeOtroModuloEnElCierre[] } | null;
    };
  }
}

export {};
