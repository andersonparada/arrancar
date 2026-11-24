import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export interface OpcionDeCatalogo {
  id: string;
  nombre: string;
}

/** Un tipo de parcela; los inactivos llegan marcados para conservar el que una parcela ya tiene. */
export interface TipoParaElegir extends OpcionDeCatalogo {
  activo: boolean;
}

/** Lo que Parcelas ofrece para elegir sin pedir los permisos de Empresas. */
export interface CatalogosDeParcelas {
  localidades: OpcionDeCatalogo[];
  inmuebles: OpcionDeCatalogo[];
  tipos: TipoParaElegir[];
}

export class ApiCatalogosDeParcelas {
  constructor(private readonly http: ClienteHttp) {}

  obtener() {
    return this.http.obtener<CatalogosDeParcelas>('/parcelas/catalogos');
  }
}

export const apiCatalogosDeParcelas = new ApiCatalogosDeParcelas(clienteHttp);
