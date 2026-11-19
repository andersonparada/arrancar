/**
 * Órdenes de `multimoneda` (ver `mediador.contratos.ts`; diseño en `docs/modulos/diseno-multimoneda.md` §9.1). Bancos,
 * Libro de compras y Cuentas por pagar la llaman antes de aceptar una moneda distinta del quetzal: si el módulo no está
 * activo en la cuenta, el mediador responde `ModuloNoDisponible` y solo aceptan GTQ.
 */

/** Una moneda extranjera que se puede usar: activa en el catálogo de la instalación. */
export interface MonedaDisponible {
  codigo: string;
  nombre: string;
  simbolo: string;
  decimales: number;
}

declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /** Las monedas activas del catálogo distintas de GTQ (sin lista por empresa en la versión 1). */
    'multimoneda.monedas_disponibles': {
      datos: Record<string, never>;
      respuesta: { monedas: MonedaDisponible[] };
    };
  }
}
