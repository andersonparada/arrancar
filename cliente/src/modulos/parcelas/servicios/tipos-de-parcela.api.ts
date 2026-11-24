import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Tipo de parcela tal como lo manda el servidor. */
export interface TipoDeParcela {
  id: string;
  nombre: string;
  activo: boolean;
}

export type DatosTipoDeParcela = Omit<TipoDeParcela, 'id'>;

const RUTA = '/parcelas/tipos-de-parcela';

export class ApiTiposDeParcela {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<TipoDeParcela[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<TipoDeParcela>(`${RUTA}/${id}`);
  }

  crear(datos: DatosTipoDeParcela) {
    return this.http.crear<TipoDeParcela>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosTipoDeParcela) {
    return this.http.reemplazar<TipoDeParcela>(`${RUTA}/${id}`, datos);
  }
}

export const apiTiposDeParcela = new ApiTiposDeParcela(clienteHttp);
