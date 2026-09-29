/**
 * Órdenes que atiende el módulo `empresas` para los demás módulos (ver `mediador.contratos.ts`).
 * Corren dentro de la transacción de quien pregunta, con la empresa de su operador.
 */
declare module './mediador.contratos.js' {
  interface OrdenesEntreModulos {
    /** La fecha de inicio de la empresa y si su carga inicial ya se cerró (`null` si aún no tiene fecha). */
    'empresas.obtener_carga_inicial': {
      datos: { empresaId: string };
      respuesta: { fechaDeInicio: string | null; cerrada: boolean };
    };
    /** Los datos de identificación de la empresa: los de `core.empresas` y los fiscales. */
    'empresas.obtener_datos_de_empresa': {
      datos: { empresaId: string };
      respuesta: {
        nombre: string;
        nit: string | null;
        razonSocial: string | null;
        nombreComercial: string | null;
      };
    };
  }
}

export {};
