/**
 * Avisos del core para los demás módulos (ver `mediador.contratos.ts`; diseño en `docs/modulos/diseno-contabilidad.md`
 * §4.1). Lo emite el `PublicadorDeEventos` dentro de la transacción del hecho.
 */

/** Un evento ya guardado en `core.registro_de_eventos`, tal como se avisa. */
export interface EventoRegistrado {
  id: string;
  nombre: string;
  version: number;
  /** Los datos del evento (dinero en centavos, como el contrato de cada módulo). */
  datos: object;
  ocurridoEn: Date;
}

declare module './mediador.contratos.js' {
  interface AvisosEntreModulos {
    /**
     * Después de guardar en el registro los eventos de una operación y antes de confirmarla: Contabilidad los
     * contabiliza en la misma transacción. Si un módulo lo rechaza (lanza), se deshace toda la operación.
     */
    'core.eventos_registrados': { eventos: EventoRegistrado[] };
  }
}
