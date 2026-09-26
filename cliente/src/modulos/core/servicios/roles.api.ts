import { api } from './cliente-http';

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

export const rolesApi = {
  listar: () => api.obtener<Rol[]>('/roles'),
  catalogoPermisos: () => api.obtener<GrupoPermisos[]>('/permisos'),
  crear: (datos: DatosRol) => api.crear<{ id: string }>('/roles', datos),
  actualizar: (id: string, datos: DatosRol) => api.reemplazar<void>(`/roles/${id}`, datos),
  eliminar: (id: string) => api.eliminar(`/roles/${id}`),
};
