/** Amplía el mapa de eventos de dominio del núcleo con los que publica terceros. */
declare module '../../core/eventos/bus-eventos.js' {
  interface EventosDominio {
    'terceros.creado': { terceroId: string; cuentaId: string };
    'terceros.actualizado': { terceroId: string; cuentaId: string };
    'terceros.inactivado': { terceroId: string; cuentaId: string };
    'terceros.papel_asignado': { terceroId: string; cuentaId: string; papel: 'cliente' | 'proveedor' | 'trabajador' };
    'terceros.papel_quitado': { terceroId: string; cuentaId: string; papel: 'cliente' | 'proveedor' | 'trabajador' };
  }
}
