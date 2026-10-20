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
    /**
     * Pone el DPI (CUI) a un proveedor que no lo tiene (factura especial, donde el vendedor se identifica por
     * CUI). Si ya tiene ese mismo DPI no hace nada; si tiene otro, o el DPI es de otro tercero de la cuenta,
     * lanza su error y se deshace la transacción de quien llama.
     */
    'terceros.completar_dpi': { datos: { proveedorId: string; dpi: string }; respuesta: void };
  }
  interface OrdenesEntreModulos {
    /**
     * Crea el proveedor de un DTE recibido que aún no lo tiene (bandeja de la SAT). Si el NIT ya es de un tercero de
     * la cuenta no lo duplica: si ya es proveedor devuelve su id; si no, le asigna el papel (`creado` es `false` en
     * los dos casos). Un proveedor inactivo se rechaza con `proveedor_inactivo`. Quien manda indica con
     * `puedeCrearProveedores` si su usuario tiene `proveedores.crear`; sin él responde `sin_permiso`. No guarda datos
     * fiscales: los guarda quien manda (Libro de compras).
     */
    'terceros.crear_proveedor_desde_dte': {
      datos: { nit: string; nombre: string; tipoDePersona: 'individual' | 'juridica'; puedeCrearProveedores: boolean };
      respuesta: { proveedorId: string; terceroId: string; creado: boolean };
    };
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
