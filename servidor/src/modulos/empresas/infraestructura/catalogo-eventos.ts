/** Declara en el catálogo del bus los eventos que publica el módulo, para que los suscriptores los reciban tipados. */
declare module '../../core/eventos/bus-eventos.js' {
  interface EventosDominio {
    'empresas.registrada': { empresaId: string; cuentaId: string };
  }
}

export {};
