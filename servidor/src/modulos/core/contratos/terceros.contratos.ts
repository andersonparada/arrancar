import type { SeccionesAportadas } from './secciones.contratos.js';

/**
 * Avisos del módulo `terceros` para los demás módulos (ver `mediador.contratos.ts`). Corren dentro de la
 * transacción de quien avisa: si un módulo rechaza su sección, no se guarda nada.
 */
declare module './mediador.contratos.js' {
  interface AvisosEntreModulos {
    /**
     * Se guardó el papel de proveedor de un tercero (al registrarlo con ese papel o al asignárselo o
     * cambiarlo). Cada módulo activo guarda su sección de `secciones`, si trae la suya.
     */
    'terceros.proveedor_guardado': { proveedorId: string; terceroId: string; secciones: SeccionesAportadas };
  }
}

export {};
