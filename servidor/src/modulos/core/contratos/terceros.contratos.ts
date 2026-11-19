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
     * Los correos registrados de un proveedor, para avisarle (p. ej. de un pago): el correo principal del tercero y,
     * de cada contacto, su correo y si tiene la marca «recibe avisos de pago». Solo lee; las direcciones ya están
     * registradas (nunca se escriben a mano para enviar). Un proveedor inexistente o de otra cuenta responde
     * `no_encontrado`.
     */
    'terceros.obtener_correos_de_proveedor': {
      datos: { proveedorId: string };
      respuesta: {
        terceroId: string;
        nombre: string;
        correo: string | null;
        contactos: Array<{ id: string; nombre: string; correo: string | null; recibeAvisosDePago: boolean }>;
      };
    };
  }
  interface OrdenesEntreModulos {
    /**
     * Crea el proveedor de un DTE recibido que aún no lo tiene (bandeja de la SAT). Si el NIT ya es de un tercero de
     * la cuenta no lo duplica: si ya es proveedor devuelve su id; si no, le asigna el papel (`creado` es `false` en
     * los dos casos). Un proveedor inactivo se rechaza con `proveedor_inactivo`. Quien manda indica con
     * `puedeCrearProveedores` si su usuario tiene `proveedores.crear`; sin él responde `sin_permiso`. La identidad pedida
     * (nombres y apellidos, o razón social) se ignora si el NIT ya es de un tercero; `nombre` es el que muestra el
     * tercero, nuevo o existente. No guarda datos
     * fiscales: los guarda quien manda (Libro de compras).
     */
    'terceros.crear_proveedor_desde_dte': {
      datos: {
        nit: string;
        tipoDePersona: 'individual' | 'juridica';
        nombres: string | null;
        apellidos: string | null;
        razonSocial: string | null;
        puedeCrearProveedores: boolean;
      };
      respuesta: { proveedorId: string; terceroId: string; creado: boolean; nombre: string };
    };
  }
  interface OrdenesEntreModulos {
    /**
     * Crea el cliente de un DTE emitido que aún no lo tiene (Libro de ventas). Igual que la del proveedor: por NIT,
     * sin duplicar; si el NIT ya es de un tercero de la cuenta le asigna el papel de cliente, y si ya es cliente
     * devuelve su id (`creado` es `false` en los dos casos). Un cliente inactivo se rechaza con `cliente_inactivo`.
     * Quien manda indica con `puedeCrearClientes` si su usuario tiene `clientes.crear`; sin él responde
     * `sin_permiso`. El NIT `CF` (consumidor final) no crea nada y responde `null`. La identidad pedida se ignora si
     * el NIT ya es de un tercero. El cliente nuevo entra con clase `directo`. No guarda datos fiscales: los guarda
     * quien manda.
     */
    'terceros.crear_cliente_desde_dte': {
      datos: {
        nit: string;
        tipoDePersona: 'individual' | 'juridica';
        nombres: string | null;
        apellidos: string | null;
        razonSocial: string | null;
        puedeCrearClientes: boolean;
      };
      respuesta: { clienteId: string; terceroId: string; creado: boolean; nombre: string } | null;
    };
  }
  interface AvisosEntreModulos {
    /**
     * Se guardó el papel de proveedor de un tercero (al registrarlo con ese papel o al asignárselo o
     * cambiarlo). Cada módulo activo guarda su sección de `secciones`, si trae la suya.
     */
    'terceros.proveedor_guardado': { proveedorId: string; terceroId: string; secciones: SeccionesAportadas };
    /**
     * Se guardó el papel de cliente de un tercero (al registrarlo con ese papel o al asignárselo o cambiarlo).
     * Cada módulo activo guarda su sección de `secciones` (`libro-de-ventas`, `cuentas-por-cobrar`), si trae la suya.
     */
    'terceros.cliente_guardado': { clienteId: string; terceroId: string; secciones: SeccionesAportadas };
  }
}

export {};
