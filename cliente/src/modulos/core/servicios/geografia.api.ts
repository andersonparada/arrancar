import { api } from './cliente-http';

export interface Departamento {
  codigo: string;
  nombre: string;
}

export interface Municipio {
  departamentoCodigo: string;
  codigo: string;
  nombre: string;
}

/** Catálogo de solo lectura de departamentos y municipios de Guatemala (INE). */
export const geografiaApi = {
  listarDepartamentos: () => api.obtener<Departamento[]>('/geografia/departamentos'),
  listarMunicipios: (departamentoCodigo: string) =>
    api.obtener<Municipio[]>(`/geografia/departamentos/${departamentoCodigo}/municipios`),
};
