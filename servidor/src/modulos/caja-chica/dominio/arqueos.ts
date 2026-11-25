/** El recurso de auditoría y de eventos de los arqueos. */
export const RECURSO_DE_ARQUEOS = 'caja-chica.arqueos';

/** Qué se hace con un faltante: se asume como pérdida del fondo o se le cobra al custodio (dictamen C10). */
export type DestinoDelFaltante = 'perdida' | 'cobrar_al_custodio';

/** Una línea del conteo: cuántos billetes o monedas de una denominación (en centavos). */
export interface LineaDeConteo {
  denominacionCentavos: number;
  cantidad: number;
}

/**
 * Un arqueo: el conteo del efectivo del fondo y su comparación con lo que el sistema esperaba. No se edita: se anula.
 * Guarda lo que decía el sistema al contar. La diferencia negativa es un faltante; la positiva, un sobrante.
 */
export interface Arqueo {
  id: string;
  fondoId: string;
  numero: number;
  anioDeNumero: number;
  /** Fecha y hora del conteo, en ISO 8601 (UTC). */
  realizadoEn: string;
  arqueadoPor: string;
  /** Nombre completo de quien arqueó, copiado al contar (para el acta). */
  arqueadoPorNombre: string;
  custodio: string;
  custodioUsuarioId: string | null;
  loHizoElCustodio: boolean;
  conteo: LineaDeConteo[];
  efectivoContadoCentavos: number;
  valoresPorCambiarCentavos: number;
  montoDelFondoCentavos: number;
  pendienteDeReponerCentavos: number;
  valesAbiertosCentavos: number;
  efectivoEsperadoCentavos: number;
  diferenciaCentavos: number;
  comprobantesCompletos: boolean;
  motivoDeDiferencia: string | null;
  observaciones: string | null;
  estado: 'vigente' | 'anulado';
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}
