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
    /**
     * Se dio de baja o se trasladó parte del saldo a favor de una nota de crédito (U13). `efecto`: `perdida` va a otros
     * gastos (no deducible); `transitoria` a «Saldos de proveedores por regularizar» o a la cuenta por cobrar del tercero;
     * `ingreso` (la diferencia de centavos de un cargo al pagar) a otros ingresos, sin IVA.
     * `serie` y `numero` son los de la nota, para la glosa. El dinero va en centavos enteros.
     */
    'cuentas-por-pagar.ajuste_registrado': {
      empresaId: string;
      ajusteId: string;
      documentoId: string;
      proveedorId: string;
      serie: string | null;
      numero: string;
      montoCentavos: number;
      fecha: string;
      causa: 'no_recuperable' | 'diferencia_menor' | 'compensado_con_otra_cuenta';
      efecto: 'perdida' | 'transitoria' | 'ingreso';
      referencia: string | null;
    };
    /** Se anuló un ajuste: `fecha` es la de la anulación y se repiten monto y efecto para revertir la partida. */
    'cuentas-por-pagar.ajuste_anulado': {
      empresaId: string;
      ajusteId: string;
      documentoId: string;
      fecha: string;
      montoCentavos: number;
      efecto: 'perdida' | 'transitoria' | 'ingreso';
    };

    /**
     * Se registró un pago a un proveedor (cheque o nota de débito; la cuenta de apertura y el efectivo llegan con sus
     * pasos). `fecha` es la del cheque (Contabilidad fecha la partida aquí, también si está posfechado) y `efecto` le dice
     * qué cuenta usar. `contrasenaIds` son las contraseñas de sus líneas, sin repetir. El dinero va en centavos enteros.
     */
    'cuentas-por-pagar.pago_registrado': {
      empresaId: string;
      /** La cuenta dueña de la empresa y quien registró el pago: con ellos un suscriptor arma su unidad de trabajo. */
      cuentaId: string;
      usuarioId: string;
      pagoId: string;
      numero: number;
      contrasenaIds: string[];
      proveedorId: string;
      forma: 'cheque' | 'nota_de_debito' | 'nota_ligada' | 'cuenta_de_apertura' | 'efectivo';
      fecha: string;
      posfechado: boolean;
      montoCentavos: number;
      movimientoId: string | null;
      cuentaBancariaId: string | null;
      retiroId: string | null;
      sinBancarizar: boolean;
      efecto: 'banco' | 'transitoria_por_aplicar' | 'apertura' | 'correccion_de_error' | 'efectivo';
      aplicaciones: Array<{
        documentoId: string;
        documentoDeCompraId: string | null;
        origen: 'libro_de_compras' | 'saldo_inicial';
        montoCentavos: number;
        retencionDescontadaCentavos: number;
        tieneActivoFijo: boolean;
      }>;
    };
    /**
     * Un pago vigente pasó a cubrir otros cargos (reaplicación). `fecha` es la de hoy; el dinero, la fecha del pago y su
     * movimiento no cambian, así que Contabilidad solo mueve lo reclasificado (`antes` y `despues`, centavos enteros).
     */
    'cuentas-por-pagar.pago_reaplicado': {
      empresaId: string;
      pagoId: string;
      fecha: string;
      fechaDelPago: string;
      efecto: 'banco' | 'transitoria_por_aplicar' | 'apertura' | 'correccion_de_error' | 'efectivo';
      retiroId: string | null;
      antes: Array<AplicacionDelPagoEnElEvento>;
      despues: Array<AplicacionDelPagoEnElEvento>;
    };
    /**
     * Se anuló un pago. `fecha` es la fecha contable de la anulación y `fechaOriginal` la del pago; `anulacionEnBancos`
     * dice cómo la hizo Bancos (`sin_inverso`: el cheque «nunca existió», se cancela la partida; `con_inverso`: se revierte
     * con `fecha`) o es `null` si el pago no tenía movimiento propio (nota ligada, cuenta de apertura, efectivo).
     */
    'cuentas-por-pagar.pago_anulado': {
      empresaId: string;
      /** La cuenta dueña de la empresa y quien anuló el pago. */
      cuentaId: string;
      usuarioId: string;
      pagoId: string;
      fecha: string;
      fechaOriginal: string;
      anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null;
      montoCentavos: number;
      efecto: 'banco' | 'transitoria_por_aplicar' | 'apertura' | 'correccion_de_error' | 'efectivo';
      movimientoId: string | null;
      retiroId: string | null;
    };
    /** Se registró un retiro de efectivo para pagos: el cheque o la nota de débito ya está en Bancos (efectivo que sigue siendo de la empresa). */
    'cuentas-por-pagar.retiro_registrado': {
      empresaId: string;
      retiroId: string;
      numero: number;
      forma: 'cheque' | 'nota_de_debito';
      fecha: string;
      montoCentavos: number;
      movimientoId: string;
      cuentaBancariaId: string;
      custodio: string;
      custodioUsuarioId: string | null;
    };
    /** Se liquidó un retiro: lo devuelto se depositó (`movimientoDeDevolucionId`) y el faltante es una pérdida o una cuenta por cobrar al custodio, según Contabilidad. */
    'cuentas-por-pagar.retiro_liquidado': {
      empresaId: string;
      retiroId: string;
      numero: number;
      fecha: string;
      devueltoCentavos: number;
      faltanteCentavos: number;
      movimientoDeDevolucionId: string | null;
    };
    /**
     * Se reabrió un retiro liquidado. `fecha` es la fecha contable de la reversa (la del inverso del depósito; la de la
     * liquidación si el depósito «nunca existió»; hoy si no hubo depósito).
     */
    'cuentas-por-pagar.retiro_reabierto': {
      empresaId: string;
      retiroId: string;
      numero: number;
      fecha: string;
      fechaDeLiquidacion: string;
      devueltoCentavos: number;
      faltanteCentavos: number;
      anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null;
    };
    /** Se anuló un retiro sin pagos; `fecha` es la fecha contable de la anulación y `fechaOriginal` la del retiro. */
    'cuentas-por-pagar.retiro_anulado': {
      empresaId: string;
      retiroId: string;
      numero: number;
      fecha: string;
      fechaOriginal: string;
      anulacionEnBancos: 'sin_inverso' | 'con_inverso';
    };
    /**
     * El proveedor devolvió saldo a favor de una o varias notas de crédito: es un cobro, por depósito (`banco`, con la nota
     * de crédito en Bancos) o en efectivo. Cada nota dice si su factura es de activo fijo (el depósito va a Inversión).
     */
    'cuentas-por-pagar.reintegro_registrado': {
      empresaId: string;
      reintegroId: string;
      numero: number;
      proveedorId: string;
      forma: 'deposito' | 'efectivo';
      fecha: string;
      montoCentavos: number;
      movimientoId: string | null;
      efecto: 'banco' | 'efectivo';
      notas: Array<{ documentoId: string; montoCentavos: number; tieneActivoFijo: boolean }>;
    };
    /**
     * Se anuló un reintegro. `fecha` es la fecha contable de la anulación y `fechaOriginal` la del reintegro;
     * `anulacionEnBancos` es `null` en el efectivo (nada se anula en Bancos).
     */
    'cuentas-por-pagar.reintegro_anulado': {
      empresaId: string;
      reintegroId: string;
      fecha: string;
      fechaOriginal: string;
      montoCentavos: number;
      forma: 'deposito' | 'efectivo';
      efecto: 'banco' | 'efectivo';
      anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null;
    };
  }
}

/** Lo que un pago entregó a un cargo, para que Contabilidad reparta la partida. */
interface AplicacionDelPagoEnElEvento {
  documentoId: string;
  documentoDeCompraId: string | null;
  origen: 'libro_de_compras' | 'saldo_inicial';
  montoCentavos: number;
  retencionDescontadaCentavos: number;
  tieneActivoFijo: boolean;
}

export {};
