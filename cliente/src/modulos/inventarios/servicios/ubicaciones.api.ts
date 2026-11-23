import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

/** Una localidad para elegirla (las que el usuario ve en Empresas). */
export interface LocalidadParaElegir {
  id: string;
  codigo: string;
  nombre: string;
  activo: boolean;
}

/** Un departamento (centro de costo) para elegirlo; puede pertenecer a una localidad. */
export interface DepartamentoParaElegir {
  id: string;
  codigo: string;
  nombre: string;
  localidadId: string | null;
  activo: boolean;
}

/** Las listas de Empresas que Inventarios usa como centro de costo; cada una exige su permiso `.ver`. */
export class ApiUbicaciones {
  constructor(private readonly http: ClienteHttp) {}

  localidades() {
    return this.http.obtener<LocalidadParaElegir[]>('/empresas/localidades');
  }

  departamentos() {
    return this.http.obtener<DepartamentoParaElegir[]>('/empresas/departamentos');
  }
}

export const apiUbicaciones = new ApiUbicaciones(clienteHttp);
