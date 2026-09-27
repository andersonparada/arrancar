import { clienteHttp, type ClienteHttp } from './cliente-http';

export interface AccesoUsuario {
  empresaId: string;
  empresaNombre: string;
  rolId: string;
  rolNombre: string;
}

export interface Usuario {
  id: string;
  usuario: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  activo: boolean;
  ultimoAccesoEn: string | null;
  accesos: AccesoUsuario[];
}

export interface AccesoSolicitado {
  empresaId: string;
  rolId: string;
}

export interface DatosNuevoUsuario {
  nombres: string;
  apellidos: string;
  /** Si se omite, el servidor lo genera a partir del nombre. */
  usuario?: string;
  correo: string | null;
  contrasena: string;
  accesos: AccesoSolicitado[];
}

export interface CambiosUsuario {
  nombres?: string;
  apellidos?: string;
  correo?: string | null;
  activo?: boolean;
  accesos?: AccesoSolicitado[];
}

export class ApiUsuarios {
  constructor(private readonly http: ClienteHttp) {}

  listar() {
    return this.http.obtener<Usuario[]>('/usuarios');
  }

  sugerirUsuario(nombres: string, apellidos: string) {
    return this.http.obtener<{ usuario: string | null }>('/usuarios/sugerencia', { nombres, apellidos });
  }

  crear(datos: DatosNuevoUsuario) {
    return this.http.crear<{ id: string; usuario: string }>('/usuarios', datos);
  }

  actualizar(id: string, datos: CambiosUsuario) {
    return this.http.modificar<void>(`/usuarios/${id}`, datos);
  }

  cambiarContrasena(id: string, contrasena: string) {
    return this.http.reemplazar<void>(`/usuarios/${id}/contrasena`, { contrasena });
  }
}

export const apiUsuarios = new ApiUsuarios(clienteHttp);
