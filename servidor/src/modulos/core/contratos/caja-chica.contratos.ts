/**
 * Eventos de `caja-chica` (ver `mediador.contratos.ts`; diseño en `docs/modulos/diseno-caja-chica-y-cuentas-por-liquidar.md`
 * §9.4). Se publican después de confirmar. El dinero va en centavos enteros. Nadie los escucha todavía (Contabilidad).
 */
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
  }
}

export {};
