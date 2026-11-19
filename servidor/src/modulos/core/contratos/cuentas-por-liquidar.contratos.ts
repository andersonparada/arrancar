import type { DocumentoParaDestino } from './libro-de-compras.contratos.js';

/**
 * Eventos de `cuentas-por-liquidar` (ver `bus-eventos.ts`; diseño en `docs/modulos/diseno-caja-chica-y-cuentas-por-liquidar.md`
 * §9.4). Son de después de confirmar, para Contabilidad (y Planilla, con lo no liquidado) y quien quiera escucharlos. El
 * dinero va en centavos enteros. Nadie los escucha todavía.
 */
declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /**
     * Recibe el documento registrado en el libro, dentro de su misma transacción; si lanza, no se registra nada. Queda en la
     * bandeja de Cuentas por liquidar o, si trae `referenciaDeDestino` (el anticipo) y se puede, asignado a él. Responde los
     * avisos que no bloquean, que Libro de compras suma a los suyos.
     */
    'cuentas-por-liquidar.recibir_documento': { datos: DocumentoParaDestino; respuesta: { avisos: string[] } };
  }
}

declare module '../eventos/bus-eventos.js' {
  interface EventosDominio {
    /** Se entregó un anticipo: el cheque o la nota de débito ya está en Bancos (dinero que sigue siendo de la empresa). */
    'cuentas-por-liquidar.anticipo_entregado': {
      empresaId: string;
      anticipoId: string;
      numero: number;
      forma: 'cheque' | 'nota_de_debito';
      fecha: string;
      fechaLimite: string;
      montoCentavos: number;
      movimientoId: string;
      cuentaBancariaId: string;
      beneficiarioId: string;
      beneficiario: string;
      esEmpleado: boolean;
    };
    /**
     * Se anuló un anticipo sin gastos; `fecha` es la fecha contable de la anulación y `fechaOriginal` la del anticipo.
     * `sin_inverso`: el cheque «nunca existió», se cancela la partida; `con_inverso`: se revierte con `fecha`.
     */
    'cuentas-por-liquidar.anticipo_anulado': {
      empresaId: string;
      anticipoId: string;
      numero: number;
      fecha: string;
      fechaOriginal: string;
      montoCentavos: number;
      anulacionEnBancos: 'sin_inverso' | 'con_inverso';
    };
    /**
     * Se liquidó un anticipo: `gastadoCentavos` es lo justificado; lo demás se devolvió (nota de crédito), se reembolsó (cheque
     * o nota de débito, si se gastó de más) o quedó sin liquidar con su destino (`cobrar` en `cuotas`, que ejecutará
     * Planilla; `renta_del_trabajo`, solo de un empleado; o `perdida`).
     */
    'cuentas-por-liquidar.anticipo_liquidado': {
      empresaId: string;
      anticipoId: string;
      numero: number;
      fecha: string;
      beneficiarioId: string;
      esEmpleado: boolean;
      montoCentavos: number;
      gastadoCentavos: number;
      devueltoCentavos: number;
      movimientoDeDevolucionId: string | null;
      reembolsadoCentavos: number;
      movimientoDeReembolsoId: string | null;
      noLiquidadoCentavos: number;
      destinoDeNoLiquidado: 'cobrar' | 'renta_del_trabajo' | 'perdida' | null;
      cuotas: number | null;
    };
    /** Se reabrió un anticipo liquidado; `fecha` es la contable (la del inverso del depósito o reembolso, si lo hubo). */
    'cuentas-por-liquidar.anticipo_reabierto': {
      empresaId: string;
      anticipoId: string;
      numero: number;
      fecha: string;
      fechaDeLiquidacion: string;
      devueltoCentavos: number;
      reembolsadoCentavos: number;
      noLiquidadoCentavos: number;
      destinoDeNoLiquidado: 'cobrar' | 'renta_del_trabajo' | 'perdida' | null;
      anulacionEnBancos: 'sin_inverso' | 'con_inverso' | null;
    };
    /** Se asignó un documento o se registró un gasto sin documento en un anticipo (`montoCentavos` es el neto). */
    'cuentas-por-liquidar.gasto_asignado': {
      empresaId: string;
      gastoId: string;
      anticipoId: string;
      clase: 'documento' | 'sin_documento';
      documentoDeCompraId: string | null;
      fecha: string;
      montoCentavos: number;
      montoRetenidoCentavos: number;
      resta: boolean;
      conActivoFijo: boolean;
      conceptoDeGastoId: string | null;
      tratamientoSinDocumento: 'no_deducible' | 'renta_del_trabajo' | null;
    };
    /** Se quitó un gasto de un anticipo abierto: el documento volvió a la bandeja o el gasto sin documento se anuló. */
    'cuentas-por-liquidar.gasto_quitado': {
      empresaId: string;
      gastoId: string;
      anticipoId: string;
      clase: 'documento' | 'sin_documento';
      fecha: string;
      montoCentavos: number;
      montoRetenidoCentavos: number;
      resta: boolean;
      volvioALaBandeja: boolean;
    };
  }
}

export {};
