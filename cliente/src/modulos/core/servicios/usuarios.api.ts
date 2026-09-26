import { api } from './cliente-http';

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

export const usuariosApi = {
  listar: () => api.obtener<Usuario[]>('/usuarios'),
  sugerirUsuario: (nombres: string, apellidos: string) =>
    api.obtener<{ usuario: string | null }>('/usuarios/sugerencia', { nombres, apellidos }),
  crear: (datos: DatosNuevoUsuario) => api.crear<{ id: string; usuario: string }>('/usuarios', datos),
  actualizar: (id: string, datos: CambiosUsuario) => api.modificar<void>(`/usuarios/${id}`, datos),
  cambiarContrasena: (id: string, contrasena: string) => api.reemplazar<void>(`/usuarios/${id}/contrasena`, { contrasena }),
};
