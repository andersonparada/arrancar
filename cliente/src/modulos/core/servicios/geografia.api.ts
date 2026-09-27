import { clienteHttp, type ClienteHttp } from './cliente-http';

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
export class ApiGeografia {
  constructor(private readonly http: ClienteHttp) {}

  listarDepartamentos() {
    return this.http.obtener<Departamento[]>('/geografia/departamentos');
  }

  listarMunicipios(departamentoCodigo: string) {
    return this.http.obtener<Municipio[]>(`/geografia/departamentos/${departamentoCodigo}/municipios`);
  }
}

export const apiGeografia = new ApiGeografia(clienteHttp);
