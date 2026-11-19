import type { ClaveDePlantilla } from '../../dominio/formatos-de-cheque/plantillas.js';

/** Chequera tal como la ve el usuario en pantalla, con el conteo de sus cheques por estado. */
export interface ChequeraDto {
  id: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  serie: string | null;
  desde: number;
  hasta: number;
  activa: boolean;
  disponibles: number;
  emitidos: number;
  anulados: number;
  /** El formato guardado con que se imprimen sus cheques (y su nombre) o la plantilla de fábrica; los dos `null` si todavía no tiene. */
  formatoDeChequeId: string | null;
  formatoNombre: string | null;
  plantillaDeCheque: ClaveDePlantilla | null;
}

/** Lo que se recibe para crear una chequera, ya validado en su forma. */
export type SolicitudDeChequera = Pick<ChequeraDto, 'cuentaBancariaId' | 'serie' | 'desde' | 'hasta'>;

/** Qué chequeras listar: de una cuenta; lo que falte no filtra. */
export interface FiltroDeChequeras {
  cuentaBancariaId?: string;
}
