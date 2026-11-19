import type { Anticipo, DestinoDeLoNoLiquidado } from '../../dominio/anticipos.js';

export interface FiltroDeNoLiquidado {
  /** Fechas de liquidación, ambas incluidas. */
  desde: string;
  hasta: string;
  destino?: DestinoDeLoNoLiquidado;
}

/** Las lecturas que solo piden los reportes. */
export interface ConsultasDeReportesDeAnticipos {
  /** Los anticipos liquidados con algo no liquidado, por destino, fecha de liquidación y número. */
  noLiquidados(filtro: FiltroDeNoLiquidado): Promise<Anticipo[]>;
}
