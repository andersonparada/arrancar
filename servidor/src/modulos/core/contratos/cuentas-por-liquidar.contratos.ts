/**
 * Eventos de `cuentas-por-liquidar` (ver `bus-eventos.ts`; diseño en `docs/modulos/diseno-caja-chica-y-cuentas-por-liquidar.md`
 * §9.4). Son de después de confirmar, para Contabilidad (y Planilla, con lo no liquidado) y quien quiera escucharlos. El
 * dinero va en centavos enteros. Nadie los escucha todavía.
 */
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
  }
}

export {};
