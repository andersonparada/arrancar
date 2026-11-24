/**
 * Órdenes y avisos del módulo `parcelas` para los módulos de rubro (Ganadería, Cultivos); ver `mediador.contratos.ts` y
 * `docs/modulos/diseno-parcelas.md` §9.1. Corren dentro de la transacción de quien pregunta, con la empresa de su
 * operador. Las superficies viajan como texto, en m² con dos decimales.
 */
declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /**
     * Cómo es una parcela en una fecha: Ganadería (carga animal, UA/ha) y Cultivos (área sembrada menor o igual a la
     * útil) la usan para sus reglas sin leer las tablas de Parcelas. `uso`, `detalleDeUso` y `cedidaATerceros` salen de
     * los períodos de uso (paso PA-2); mientras tanto, `null`, `null` y `false`.
     */
    'parcelas.obtener_parcela_en_fecha': {
      datos: { parcelaId: string; fecha: string };
      respuesta: {
        codigo: string;
        nombre: string;
        localidadId: string;
        nivel: number;
        activa: boolean;
        superficieTotalM2: string | null;
        superficieUtilM2: string | null;
        uso: string | null;
        detalleDeUso: string | null;
        formaDeTenencia: string;
        cedidaATerceros: boolean;
      };
    };
  }
  interface AvisosEntreModulos {
    /**
     * Una parcela se va a inactivar a partir de `fecha`. Cada módulo de rubro lanza su error si la parcela tiene una
     * ocupación o un ciclo abierto; el error deshace la inactivación. Sin escucha, se inactiva.
     */
    'parcelas.parcela_por_inactivar': { parcelaId: string; fecha: string };
    /** Una parcela se va a eliminar. Igual que `parcela_por_inactivar`; sin escucha, se elimina. */
    'parcelas.parcela_por_eliminar': { parcelaId: string };
  }
}

export {};
