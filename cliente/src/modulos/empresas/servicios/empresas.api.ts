import { api } from '@/modulos/core/servicios/cliente-http';

export interface Empresa {
  id: string;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  monedaBase: string;
  activa: boolean;
  actualizadoEn: string;
}

export interface DatosEmpresa {
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  activa: boolean;
}

export const empresasApi = {
  listar: () => api.obtener<Empresa[]>('/empresas'),
  crear: (datos: DatosEmpresa) => api.crear<Empresa>('/empresas', datos),
  actualizar: (id: string, datos: DatosEmpresa) => api.reemplazar<Empresa>(`/empresas/${id}`, datos),
};
