import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

/** Chequera tal como la manda el servidor, con el conteo de sus cheques por estado. */
export interface Chequera {
  id: string;
  cuentaBancariaId: string;
  serie: string | null;
  desde: number;
  hasta: number;
  activa: boolean;
  disponibles: number;
  emitidos: number;
  anulados: number;
}

export type DatosChequera = Pick<Chequera, 'serie' | 'desde' | 'hasta'>;

/** Chequeras: se ven y se crean desde la ficha de la cuenta bancaria (administración); sin Excel. */
export class ApiChequeras {
  constructor(private readonly http: ClienteHttp) {}

  listarDeLaCuenta(cuentaBancariaId: string) {
    return this.http.obtener<Chequera[]>(`/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`);
  }

  crear(cuentaBancariaId: string, datos: DatosChequera) {
    return this.http.crear<Chequera>(`/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`, datos);
  }

  inactivar(id: string) {
    return this.http.crear<Chequera>(`/bancos/chequeras/${id}/inactivar`);
  }

  reactivar(id: string) {
    return this.http.crear<Chequera>(`/bancos/chequeras/${id}/reactivar`);
  }
}

export const apiChequeras = new ApiChequeras(clienteHttp);
