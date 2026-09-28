import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Chequera tal como la manda el servidor, con el conteo de sus cheques por estado. */
export interface Chequera {
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

export type DatosChequera = Pick<Chequera, 'serie' | 'desde' | 'hasta'>;

const RUTA = '/bancos/chequeras';

/** Chequeras: su propia pantalla de administración (con Excel), y también se crean desde la ficha de la cuenta. */
export class ApiChequeras {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  /** Todas las chequeras de la empresa, opcionalmente de una cuenta. */
  listar(cuentaBancariaId?: string | null) {
    return this.http.obtener<Chequera[]>(RUTA, cuentaBancariaId ? { cuentaBancariaId } : undefined);
  }

  listarDeLaCuenta(cuentaBancariaId: string) {
    return this.http.obtener<Chequera[]>(`/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`);
  }

  crear(cuentaBancariaId: string, datos: DatosChequera) {
    return this.http.crear<Chequera>(`/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`, datos);
  }

  inactivar(id: string) {
    return this.http.crear<Chequera>(`${RUTA}/${id}/inactivar`);
  }

  reactivar(id: string) {
    return this.http.crear<Chequera>(`${RUTA}/${id}/reactivar`);
  }
}

export const apiChequeras = new ApiChequeras(clienteHttp);
