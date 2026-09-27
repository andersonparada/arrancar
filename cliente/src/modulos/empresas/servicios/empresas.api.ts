import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

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

export class ApiEmpresas {
  constructor(private readonly http: ClienteHttp) {}

  listar() {
    return this.http.obtener<Empresa[]>('/empresas');
  }

  crear(datos: DatosEmpresa) {
    return this.http.crear<Empresa>('/empresas', datos);
  }

  actualizar(id: string, datos: DatosEmpresa) {
    return this.http.reemplazar<Empresa>(`/empresas/${id}`, datos);
  }
}

export const apiEmpresas = new ApiEmpresas(clienteHttp);
