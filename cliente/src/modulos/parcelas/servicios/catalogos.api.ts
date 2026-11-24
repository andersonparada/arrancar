import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export interface OpcionDeCatalogo {
  id: string;
  nombre: string;
}

/** Lo que Parcelas ofrece para elegir sin pedir los permisos de Empresas. */
export interface CatalogosDeParcelas {
  localidades: OpcionDeCatalogo[];
  inmuebles: OpcionDeCatalogo[];
}

export class ApiCatalogosDeParcelas {
  constructor(private readonly http: ClienteHttp) {}

  obtener() {
    return this.http.obtener<CatalogosDeParcelas>('/parcelas/catalogos');
  }
}

export const apiCatalogosDeParcelas = new ApiCatalogosDeParcelas(clienteHttp);
