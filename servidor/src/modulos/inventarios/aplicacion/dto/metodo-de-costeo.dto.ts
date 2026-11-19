import type { MetodoDeCosteo } from '../../dominio/costeo/tipos.js';

/** Una fila de la historia del método. */
export interface FilaDeMetodoDto {
  id: string;
  metodo: MetodoDeCosteo;
  desde: string;
  fijado: boolean;
  autorizacionSatNumero: string | null;
  autorizacionSatFecha: string | null;
  motivo: string | null;
}

/** La política de costeo de la empresa: la que rige hoy y su historia. */
export interface PoliticaDeCosteoDto {
  /** Falso si nadie la eligió: `metodo` es entonces la propuesta (`inventarios.costeo.metodo_inicial`). */
  elegido: boolean;
  /** Si ya la usó un movimiento: desde ahí solo se cambia con la autorización de la SAT. */
  fijado: boolean;
  metodo: MetodoDeCosteo;
  historia: FilaDeMetodoDto[];
}

export interface SolicitudDeMetodo {
  metodo: MetodoDeCosteo;
}
