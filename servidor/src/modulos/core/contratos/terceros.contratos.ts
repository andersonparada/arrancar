import type { SeccionesAportadas } from './secciones.contratos.js';

/**
 * Avisos del módulo `terceros` para los demás módulos (ver `mediador.contratos.ts`). Corren dentro de la
 * transacción de quien avisa: si un módulo rechaza su sección, no se guarda nada.
 */
declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /**
     * Pone el NIT a un proveedor que no lo tiene (Libro de compras, al registrar un documento con el NIT del
     * emisor). Si ya tiene ese mismo NIT no hace nada; si tiene otro, o el NIT es de otro tercero de la cuenta,
     * lanza su error y se deshace la transacción de quien llama.
     */
    'terceros.completar_nit': { datos: { proveedorId: string; nit: string }; respuesta: void };
  }
  interface AvisosEntreModulos {
    /**
     * Se guardó el papel de proveedor de un tercero (al registrarlo con ese papel o al asignárselo o
     * cambiarlo). Cada módulo activo guarda su sección de `secciones`, si trae la suya.
     */
    'terceros.proveedor_guardado': { proveedorId: string; terceroId: string; secciones: SeccionesAportadas };
  }
}

export {};
