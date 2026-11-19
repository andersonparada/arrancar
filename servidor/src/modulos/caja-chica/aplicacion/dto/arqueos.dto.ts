import type { ComprobanteDto } from './comprobantes.dto.js';

/** Una línea del conteo: la denominación, cuántas hay y lo que suman. Dinero como texto con dos decimales. */
export interface LineaDeConteoDto {
  denominacion: string;
  cantidad: number;
  subtotal: string;
}

/** El arqueo como lo muestra la lista. */
export interface ArqueoResumenDto {
  id: string;
  fondoId: string;
  numero: number;
  realizadoEn: string;
  custodio: string;
  loHizoElCustodio: boolean;
  efectivoContado: string;
  valoresPorCambiar: string;
  efectivoEsperado: string;
  /** Negativa = faltante. */
  diferencia: string;
  estado: 'vigente' | 'anulado';
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

/** El arqueo completo, para el acta; también es lo que queda en la auditoría como «anterior» al anularlo. */
export interface ArqueoDto extends ArqueoResumenDto {
  arqueadoPor: string;
  conteo: LineaDeConteoDto[];
  montoDelFondo: string;
  pendienteDeReponer: string;
  valesAbiertos: string;
  comprobantesCompletos: boolean;
  motivoDeDiferencia: string | null;
  observaciones: string | null;
  destinoDelFaltante: 'perdida' | 'cobrar_al_custodio' | null;
  /** El faltante o sobrante que nació de la diferencia. */
  comprobante: ComprobanteDto | null;
  /** Los avisos que no bloquean (la separación de funciones); solo al registrar. */
  avisos: string[];
}

/** Lo que el sistema espera hoy en la caja, para que el arqueador cuente contra eso. */
export interface PropuestaDeArqueoDto {
  fondoId: string;
  fondoNombre: string;
  custodio: string | null;
  monto: string;
  pendienteDeReponer: string;
  valesAbiertos: string;
  efectivoEsperado: string;
  /** Las denominaciones que se cuentan, de mayor a menor. */
  denominaciones: string[];
  /** Los comprobantes pendientes de reponer que se deben ver. */
  pendientes: ComprobanteDto[];
  avisos: string[];
}
