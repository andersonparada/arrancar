import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

export interface Enlace {
  id: string;
  rol: string;
  /** El id del registro del otro módulo; nulo = rige para todo el rol. */
  llave: string | null;
  llaveNombre: string | null;
  cuentaId: string;
  cuentaCodigo: string;
  cuentaNombre: string;
}

/** Un rol de sistema de los módulos activos, con lo que ya está enlazado. */
export interface RolDeEnlace {
  rol: string;
  nombre: string;
  modulos: string[];
  admiteLlave: boolean;
  nombreDeLlave: string | null;
  esDeAuxiliar: boolean;
  enlaces: Enlace[];
}

/** Un registro de otro módulo con el que se puede enlazar un rol. */
export interface LlaveDeEnlace {
  llave: string;
  nombre: string;
  activo: boolean;
}

export class ApiEnlaces {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar los enlaces en Excel. */
  get intercambio() {
    return intercambioDe(this.http, '/contabilidad/enlaces');
  }

  listar() {
    return this.http.obtener<RolDeEnlace[]>('/contabilidad/enlaces');
  }

  llaves(rol: string) {
    return this.http.obtener<LlaveDeEnlace[]>(`/contabilidad/enlaces/llaves/${rol}`);
  }

  guardar(rol: string, datos: { llave: string | null; cuentaId: string }) {
    return this.http.reemplazar<Enlace>(`/contabilidad/enlaces/${rol}`, datos);
  }

  quitar(enlaceId: string) {
    return this.http.eliminar(`/contabilidad/enlaces/${enlaceId}`);
  }
}

export const apiEnlaces = new ApiEnlaces(clienteHttp);
