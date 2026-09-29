import { clienteHttp, type ClienteHttp } from './cliente-http';

export interface EmpresaDeUsuario {
  empresaId: string;
  empresaNombre: string;
}

export interface RolDeUsuario {
  rolId: string;
  rolNombre: string;
  accesoTotal: boolean;
}

export interface Usuario {
  id: string;
  usuario: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  activo: boolean;
  ultimoAccesoEn: string | null;
  empresas: EmpresaDeUsuario[];
  roles: RolDeUsuario[];
  totalPermisosDirectos: number;
}

export interface DatosNuevoUsuario {
  nombres: string;
  apellidos: string;
  /** Si se omite, el servidor lo genera a partir del nombre. */
  usuario?: string;
  correo: string | null;
  contrasena: string;
  empresaIds: string[];
  /** Solo los acepta el servidor si quien crea tiene `usuarios.asignar-permisos`. */
  rolIds?: string[];
  permisos?: string[];
}

export interface CambiosUsuario {
  nombres?: string;
  apellidos?: string;
  correo?: string | null;
  activo?: boolean;
  empresaIds?: string[];
}

/** De dónde le viene un permiso al usuario. */
export type OrigenDelPermiso =
  { tipo: 'rol'; rolId: string; rolNombre: string } | { tipo: 'acceso-total'; rolNombre: string } | { tipo: 'directo' };

export interface PermisoEfectivo {
  clave: string;
  descripcion: string;
  modulo: string;
  origenes: OrigenDelPermiso[];
  moduloActivo: boolean;
}

export interface PermisosDeUsuario {
  roles: RolDeUsuario[];
  directos: string[];
  efectivos: PermisoEfectivo[];
}

export interface AsignacionesDeUsuario {
  rolIds: string[];
  permisos: string[];
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

  permisosDe(id: string) {
    return this.http.obtener<PermisosDeUsuario>(`/usuarios/${id}/permisos`);
  }

  asignarPermisos(id: string, datos: AsignacionesDeUsuario) {
    return this.http.reemplazar<void>(`/usuarios/${id}/permisos`, datos);
  }

  cambiarContrasena(id: string, contrasena: string) {
    return this.http.reemplazar<void>(`/usuarios/${id}/contrasena`, { contrasena });
  }
}

export const apiUsuarios = new ApiUsuarios(clienteHttp);
