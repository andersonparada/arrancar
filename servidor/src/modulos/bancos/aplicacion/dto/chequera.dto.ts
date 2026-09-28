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
}

/** Lo que se recibe para crear una chequera, ya validado en su forma. */
export type SolicitudDeChequera = Pick<ChequeraDto, 'cuentaBancariaId' | 'serie' | 'desde' | 'hasta'>;

/** Qué chequeras listar: de una cuenta; lo que falte no filtra. */
export interface FiltroDeChequeras {
  cuentaBancariaId?: string;
}
