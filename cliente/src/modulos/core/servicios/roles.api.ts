import { clienteHttp, type ClienteHttp } from './cliente-http';

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string | null;
  accesoTotal: boolean;
  permisos: string[];
  totalUsuarios: number;
}

export interface GrupoPermisos {
  modulo: string;
  nombre: string;
  permisos: { clave: string; descripcion: string }[];
}

export interface DatosRol {
  nombre: string;
  descripcion: string | null;
  accesoTotal: boolean;
  permisos: string[];
}

export class ApiRoles {
  constructor(private readonly http: ClienteHttp) {}

  listar() {
    return this.http.obtener<Rol[]>('/roles');
  }

  catalogoPermisos() {
    return this.http.obtener<GrupoPermisos[]>('/permisos');
  }

  crear(datos: DatosRol) {
    return this.http.crear<{ id: string }>('/roles', datos);
  }

  actualizar(id: string, datos: DatosRol) {
    return this.http.reemplazar<void>(`/roles/${id}`, datos);
  }

  eliminar(id: string) {
    return this.http.eliminar(`/roles/${id}`);
  }
}

export const apiRoles = new ApiRoles(clienteHttp);
