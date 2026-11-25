/**
 * Órdenes y avisos de `libro-de-compras` (ver `mediador.contratos.ts`). Las órdenes las llaman los módulos de
 * destino (Cuentas por pagar, Caja chica…) desde sus pantallas; Libro de compras las atiende (L3-6) con las mismas
 * reglas que su propia pantalla. Los avisos son suyos: corren dentro de la transacción de quien avisa. Los eventos
 * de después de confirmar van al bus; el dinero siempre viaja en centavos enteros.
 */

/** Los módulos a donde puede ir un documento del libro. */
export type DestinoDeDocumento = 'cuentas-por-pagar' | 'caja-chica' | 'cuentas-por-liquidar';

/** Por qué se anula el registro de un documento (no la FEL: solo su emisor la anula en la SAT). */
export type CausaDeAnulacionDeDocumento =
  'error_de_captura' | 'fel_anulada_por_el_emisor' | 'no_corresponde_a_la_empresa';

export type TipoDeDocumentoDeCompra =
  | 'factura'
  | 'factura_pequeno_contribuyente'
  | 'factura_pequeno_contribuyente_electronico'
  | 'factura_contribuyente_agropecuario'
  | 'factura_primario_pecuario'
  | 'factura_especial'
  | 'nota_de_credito'
  | 'nota_de_debito'
  | 'recibo';

/**
 * La factura del sistema anterior que corrige una nota (no está en el libro de Arrancar). Contabilidad usa
 * `fechaEmision` para saber si el costo que la nota corrige es de un año anterior (ISR: menor costo u otro ingreso del
 * año en que se recibe la nota).
 */
export interface FacturaAnteriorDeLaNota {
  /** Siempre de la familia de factura. */
  tipo: TipoDeDocumentoDeCompra;
  serie: string | null;
  numero: string;
  /** `AAAA-MM-DD`. */
  fechaEmision: string;
}

/** Lo que recibe cada destino en su orden `<destino>.recibir_documento`. */
export interface DocumentoParaDestino {
  documentoId: string;
  tipo: TipoDeDocumentoDeCompra;
  proveedorId: string;
  /** La factura que corrige, en las notas de crédito y de débito. */
  documentoAfectadoId: string | null;
  /**
   * La factura del sistema anterior que corrige la nota, en las notas sobre una de ellas; ausente o nulo en lo demás
   * (opcional al leerlo: los destinos viejos y las pruebas no la traen).
   */
  facturaAnterior?: FacturaAnteriorDeLaNota | null;
  /**
   * El registro del destino al que el usuario mandó el documento (el fondo de Caja chica, el anticipo…), tal como vino
   * en el cuerpo. Libro de compras no la guarda ni la valida (no es suya): solo la pasa. Opcional al leerla.
   */
  referenciaDeDestino?: string | null;
  /** `AAAA-MM-DD`. */
  fechaEmision: string;
  totalCentavos: number;
  retencionesCentavos: number;
  tieneActivoFijo: boolean;
}

/** Qué pierde la empresa si un pago en efectivo no está bancarizado: el crédito fiscal del IVA y/o el costo del ISR. */
export interface EfectoFiscalDeBancarizacion {
  iva: boolean;
  isr: boolean;
}

/** Lo que un módulo dice haber pagado a un proveedor en un mes, en efectivo y por medios bancarios (vigente, antes de retenciones). */
export interface PagadoAlProveedorEnElMes {
  efectivoCentavos: number;
  bancarizadoCentavos: number;
  /** Etiquetas para leer de dónde sale: «Recibo N», «Caja chica F, vale N», «Anticipo N». */
  comprobantes: string[];
}

/** Un cargo del pago en efectivo a evaluar; `documentoDeCompraId` es el del libro (`null` en un saldo inicial). */
export interface CargoPorBancarizar {
  documentoDeCompraId: string | null;
  etiqueta: string;
  totalCentavos: number;
  /** Solo en un saldo inicial: lo que pierde según el régimen de la fecha de inicio; ausente o nulo si no se sabe. */
  efectoDeSaldoInicial?: EfectoFiscalDeBancarizacion | null;
}

/** Qué hacer con un pago en efectivo según la bancarización: el módulo que llama decide qué pasa con `bloquear`. */
export interface EvaluacionDeBancarizacion {
  resultado: 'libre' | 'avisar' | 'bloquear';
  mensaje: string | null;
  efecto: EfectoFiscalDeBancarizacion | null;
  /** Lo pagado al proveedor en el mes por todos los módulos (efectivo y bancarizado), sin este pago. */
  pagadoEnElMesCentavos: number;
}

/** Una cifra de ventas para la declaración del período (monto con dos decimales y signo, o cantidad entera). */
export interface CifraDeDeclaracion {
  /** Clave propia del módulo que responde: `debito_por_rubro`, `ventas_exentas`... */
  clave: string;
  /** «Ventas exentas». */
  etiqueta: string;
  tipo: 'monto' | 'cantidad';
  valor: string;
}

/** Lo que un módulo de ventas dice de un período para la foto de la declaración. */
export interface CifrasParaLaDeclaracion {
  modulo: string;
  /** Qué conjunto de cifras es (`ventas`). */
  clave: string;
  cifras: CifraDeDeclaracion[];
}

declare module './mediador.contratos.js' {
  interface PreguntasEntreModulos {
    /**
     * Al declarar o rectificar un período, Libro de compras pregunta a todos las cifras de ventas del mes (`periodo` es
     * `AAAA-MM-01`); responde `null` quien no tenga nada que decir. Lo guarda en `foto.ventas`. Un mes sin ventas con
     * el módulo activo y en uso responde las cifras en `0.00` (`debito`, `retenciones_de_iva`, `ingresos`): es un débito
     * conocido igual a cero y el crédito se acumula (Ley del IVA, art. 21). `null` solo cuando no puede saberlo (por
     * ejemplo, un mes anterior a empezar a usar el módulo): una lista de cifras vacía se trata como «sin respuesta» y
     * cortaría la cadena de remanentes.
     */
    'libro-de-compras.cifras_para_la_declaracion': {
      datos: { periodo: string };
      respuesta: CifrasParaLaDeclaracion | null;
    };
    /**
     * Cada módulo que paga a proveedores (Cuentas por pagar, Caja chica, Cuentas por liquidar) dice lo pagado al
     * proveedor en el mes (`mes` es `AAAA-MM-01`); responde `null` si no tiene nada que decir.
     */
    'libro-de-compras.pagado_al_proveedor_en_el_mes': {
      datos: { proveedorId: string; mes: string };
      respuesta: PagadoAlProveedorEnElMes | null;
    };
  }
  interface OrdenesEntreModulos {
    /**
     * Evalúa la bancarización de un pago en efectivo con lo pagado por todos los módulos. Primero toma el bloqueo por
     * proveedor (`libro-de-compras.bancarizacion:<empresa>:<proveedor>`), así que quien llama ya queda en su turno.
     */
    'libro-de-compras.evaluar_bancarizacion': {
      datos: {
        proveedorId: string;
        proveedorNombre: string;
        /** `AAAA-MM-DD`: la fecha del pago, que fija el mes. */
        fecha: string;
        montoEnEfectivoCentavos: number;
        cargos: CargoPorBancarizar[];
      };
      respuesta: EvaluacionDeBancarizacion;
    };
    /**
     * Inventarios quita (o vuelve a poner) la marca de inventario de una línea al descartarla de su bandeja o devolverla
     * a ella (V-8). Cambia solo `es_inventario` de una línea de un documento vigente, aunque el período esté cerrado:
     * ninguna cifra declarada mira esa marca. Audita `corregir` en el libro con la línea antes y el motivo.
     */
    'libro-de-compras.cambiar_marca_de_inventario': {
      datos: { lineaId: string; documentoId: string; esInventario: boolean; motivo: string };
      respuesta: void;
    };
    /** El destino marca el documento como procesado (`true`) o lo devuelve a pendiente (`false`). */
    'libro-de-compras.marcar_procesado': { datos: { documentoId: string; procesado: boolean }; respuesta: void };
    /**
     * El destino anula o elimina desde su pantalla; Libro de compras aplica sus reglas. `origen` es el destino que
     * pide: como ya hizo lo suyo, Libro de compras no le devuelve el aviso (así no hay ciclo de avisos).
     */
    'libro-de-compras.anular_documento': {
      datos: { documentoId: string; causa: CausaDeAnulacionDeDocumento; motivo: string; origen?: DestinoDeDocumento };
      /** Los avisos que no bloquean: período posiblemente declarado y retenciones que quedan «por resolver». */
      respuesta: { avisos: string[] };
    };
    'libro-de-compras.eliminar_documento': {
      datos: { documentoId: string; origen?: DestinoDeDocumento };
      respuesta: void;
    };
  }
  interface AvisosEntreModulos {
    /** Antes de anular: el destino revierte lo suyo o lanza su error (se deshace todo). Su manejador es idempotente. */
    'libro-de-compras.documento_por_anular': {
      documentoId: string;
      destino: DestinoDeDocumento;
      motivo: string;
      /** Por qué se anula el registro: `fel_anulada_por_el_emisor` es un hecho externo que el destino no puede vetar. */
      causa: 'error_de_captura' | 'fel_anulada_por_el_emisor' | 'no_corresponde_a_la_empresa';
    };
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
    /** Un período del libro se declaró o se rectificó (`periodo` es el primer día del mes). */
    'libro-de-compras.periodo_declarado': { empresaId: string; periodo: string; rectificacion: boolean };
    /** Un período declarado se reabrió. */
    'libro-de-compras.periodo_reabierto': { empresaId: string; periodo: string };
  }
}

export {};
