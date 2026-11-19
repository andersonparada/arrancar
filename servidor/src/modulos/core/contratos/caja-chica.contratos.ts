import type { DocumentoParaDestino } from './libro-de-compras.contratos.js';

/** Lo que un comprobante aportó a una reposición. Dinero en centavos enteros, firmado. */
interface LineaDeReposicionEmitida {
  comprobanteId: string;
  clase: 'documento' | 'vale_de_gasto' | 'faltante' | 'sobrante';
  documentoDeCompraId: string | null;
  conceptoDeGastoId: string | null;
  montoCentavos: number;
  conActivoFijo: boolean;
  deducible: boolean;
}

/**
 * Órdenes y eventos de `caja-chica` (ver `mediador.contratos.ts`; diseño en `docs/modulos/diseno-caja-chica-y-cuentas-por-liquidar.md`
 * §9.4). Se publican después de confirmar. El dinero va en centavos enteros. Nadie los escucha todavía (Contabilidad).
 */
declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /**
     * Recibe el documento registrado en el libro, dentro de su misma transacción. El comprobante queda en la bandeja de
     * Caja chica; si trae `referenciaDeDestino` (el fondo) y no lleva retención, se intenta asignar. Responde los avisos
     * que no bloquean (por qué quedó en la bandeja, la bancarización…), que el libro suma a los suyos.
     */
    'caja-chica.recibir_documento': { datos: DocumentoParaDestino; respuesta: { avisos: string[] } };
  }
}

declare module '../eventos/bus-eventos.js' {
  interface EventosDominio {
    /** Se abrió un fondo: el cheque o la nota de débito ya está en Bancos (efectivo que pasa al custodio). */
    'caja-chica.fondo_abierto': {
      empresaId: string;
      fondoId: string;
      nombre: string;
      fecha: string;
      montoCentavos: number;
      forma: 'cheque' | 'nota_de_debito';
      movimientoId: string;
      cuentaBancariaId: string;
      custodio: string;
      custodioUsuarioId: string | null;
    };
    /** El fondo aumentó (cheque o nota de débito) o disminuyó (el custodio depositó, con nota de crédito). */
    'caja-chica.monto_del_fondo_cambiado': {
      empresaId: string;
      fondoId: string;
      cambioId: string;
      tipo: 'aumento' | 'disminucion';
      fecha: string;
      montoCentavos: number;
      movimientoId: string;
      cuentaBancariaId: string;
    };
    /**
     * Se anuló la apertura (el fondo queda cerrado) o un aumento. `fecha` es la fecha contable de la anulación y
     * `fechaOriginal` la del cambio; con `sin_inverso` el cambio «nunca existió».
     */
    'caja-chica.cambio_de_monto_anulado': {
      empresaId: string;
      fondoId: string;
      cambioId: string;
      tipo: 'apertura' | 'aumento';
      fecha: string;
      fechaOriginal: string;
      montoCentavos: number;
      anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null;
    };
    /** Cambió quién lleva el efectivo del fondo. */
    'caja-chica.custodio_cambiado': {
      empresaId: string;
      fondoId: string;
      fecha: string;
      custodioAnterior: string;
      custodio: string;
      custodioUsuarioId: string | null;
      motivo: string;
    };
    /**
     * Un comprobante entró a un fondo: un documento del libro asignado o un vale de gasto (sin factura, no deducible).
     * `montoCentavos` es lo que salió del fondo (con retención, el neto) y `resta` dice si baja lo pendiente de reponer
     * (nota de crédito). `conceptoDeGastoId` solo viene en el vale; en un documento el concepto está en sus líneas del libro.
     */
    'caja-chica.comprobante_asignado': {
      empresaId: string;
      fondoId: string;
      comprobanteId: string;
      clase: 'documento' | 'vale_de_gasto';
      documentoDeCompraId: string | null;
      fecha: string;
      montoCentavos: number;
      montoRetenidoCentavos: number;
      resta: boolean;
      conceptoDeGastoId: string | null;
      deducible: boolean;
      conActivoFijo: boolean;
    };
    /** Un comprobante salió del fondo: volvió a la bandeja o se anuló. Deshace el efecto de `comprobante_asignado`. */
    'caja-chica.comprobante_quitado': {
      empresaId: string;
      fondoId: string;
      comprobanteId: string;
      clase: 'documento' | 'vale_de_gasto';
      fecha: string;
      montoCentavos: number;
      resta: boolean;
      motivo: 'devuelto_a_la_bandeja' | 'anulado';
    };
    /**
     * Se repuso el fondo: el cheque o la nota de débito ya está en Bancos. `lineas` trae cada comprobante con su monto
     * firmado (lo que resta, negativo), su documento del libro, concepto (solo en el vale de gasto), activo fijo y si es
     * deducible; `desglose` es el reparto por concepto de Bancos (operación, activo fijo y faltantes), que suma el monto.
     */
    'caja-chica.reposicion_registrada': {
      empresaId: string;
      fondoId: string;
      reposicionId: string;
      numero: number;
      fecha: string;
      forma: 'cheque' | 'nota_de_debito';
      montoCentavos: number;
      movimientoId: string;
      cuentaBancariaId: string;
      desglose: { operacionCentavos: number; activoCentavos: number; faltanteCentavos: number };
      lineas: LineaDeReposicionEmitida[];
    };
    /**
     * Se anuló una reposición: sus comprobantes vuelven a pendientes. `fechaDeAnulacion` es la fecha contable y
     * `fecha` la original; con `sin_inverso` la reposición «nunca existió».
     */
    'caja-chica.reposicion_anulada': {
      empresaId: string;
      fondoId: string;
      reposicionId: string;
      numero: number;
      fecha: string;
      fechaDeAnulacion: string;
      montoCentavos: number;
      anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null;
      lineas: LineaDeReposicionEmitida[];
    };
  }
}

export {};
