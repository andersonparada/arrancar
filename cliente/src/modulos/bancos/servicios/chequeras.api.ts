import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';
import type { ClaveDePlantilla } from './tipos-de-formatos-de-cheque';

/** Chequera tal como la manda el servidor, con el conteo de sus cheques por estado. */
export interface Chequera {
  id: string;
  cuentaBancariaId: string;
  cuentaBancariaNombre: string;
  serie: string | null;
  desde: number;
  hasta: number;
  activa: boolean;
  /** La chequera de la carga inicial: junta los cheques en circulación al corte; no se emite ni se inactiva. */
  deApertura: boolean;
  disponibles: number;
  emitidos: number;
  anulados: number;
  /** Con qué se imprimen sus cheques: un formato de la cuenta o una plantilla de fábrica; los dos `null` si todavía no tiene. */
  formatoDeChequeId: string | null;
  formatoNombre: string | null;
  plantillaDeCheque: ClaveDePlantilla | null;
}

/** Lo que se elige al asignar el formato: una de las dos cosas, o ninguna. */
export interface FormatoDeChequera {
  formatoDeChequeId: string | null;
  plantillaDeCheque: ClaveDePlantilla | null;
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

  /** Con qué formato se imprimen sus cheques (pide `bancos.chequeras.editar`). */
  asignarFormato(id: string, formato: FormatoDeChequera) {
    return this.http.modificar<Chequera>(`${RUTA}/${id}/formato`, formato);
  }
}

export const apiChequeras = new ApiChequeras(clienteHttp);
