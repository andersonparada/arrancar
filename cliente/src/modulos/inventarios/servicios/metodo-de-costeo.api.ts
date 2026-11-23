import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export type MetodoDeCosteo = 'promedio_ponderado' | 'peps';

/** Una fila de la historia del método. */
export interface FilaDeMetodo {
  id: string;
  metodo: MetodoDeCosteo;
  desde: string;
  fijado: boolean;
  autorizacionSatNumero: string | null;
  autorizacionSatFecha: string | null;
  motivo: string | null;
}

/** La política de costeo de la empresa: la que rige hoy y su historia. */
export interface PoliticaDeCosteo {
  /** Falso si nadie la eligió todavía: `metodo` es entonces solo la propuesta. */
  elegido: boolean;
  /** Si ya la usó un movimiento, desde ahí solo se cambia con la autorización de la SAT. */
  fijado: boolean;
  metodo: MetodoDeCosteo;
  historia: FilaDeMetodo[];
}

const RUTA = '/inventarios/metodo-de-costeo';

export class ApiMetodoDeCosteo {
  constructor(private readonly http: ClienteHttp) {}

  obtener() {
    return this.http.obtener<PoliticaDeCosteo>(RUTA);
  }

  elegir(metodo: MetodoDeCosteo) {
    return this.http.crear<PoliticaDeCosteo>(RUTA, { metodo });
  }
}

export const apiMetodoDeCosteo = new ApiMetodoDeCosteo(clienteHttp);
