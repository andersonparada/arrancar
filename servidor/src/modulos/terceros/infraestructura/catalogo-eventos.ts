import type { TipoDePapel } from '../dominio/papeles.js';

/** Declara en el catálogo del bus los eventos que publica el módulo, para que los suscriptores los reciban tipados. */
declare module '../../core/eventos/bus-eventos.js' {
  interface EventosDominio {
    'terceros.creado': { terceroId: string; cuentaId: string };
    'terceros.actualizado': { terceroId: string; cuentaId: string };
    'terceros.inactivado': { terceroId: string; cuentaId: string };
    'terceros.papel_asignado': { terceroId: string; cuentaId: string; papel: TipoDePapel };
    'terceros.papel_quitado': { terceroId: string; cuentaId: string; papel: TipoDePapel };
  }
}
