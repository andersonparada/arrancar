import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export type RegimenDeIva = 'general' | 'pequeno_contribuyente';
export type RegimenDeIsrDeEmpresa = 'utilidades' | 'opcional_simplificado';
export type AgenteDeRetencionDeIva = 'ninguno' | 'exportador' | 'contribuyente_especial' | 'sector_publico' | 'otro';
export type RegimenDeIsrDeProveedor = 'utilidades' | 'opcional_simplificado' | 'no_domiciliado';

/** Datos fiscales de una empresa; `guardado` es falso si el servidor devuelve los valores por omisión. */
export interface DatosFiscalesDeEmpresa {
  empresaId: string;
  regimenIva: RegimenDeIva;
  regimenIsr: RegimenDeIsrDeEmpresa;
  agenteDeRetencionIva: AgenteDeRetencionDeIva;
  esAgenteDeRetencionIsr: boolean;
  guardado: boolean;
}

/** Datos fiscales de un proveedor; `guardado` es falso si el servidor devuelve los valores por omisión. */
export interface DatosFiscalesDeProveedor {
  proveedorId: string;
  esPequenoContribuyente: boolean;
  regimenIsr: RegimenDeIsrDeProveedor | null;
  esAgenteDeRetencionIva: boolean;
  seLeRetieneIva: boolean;
  seLeRetieneIsr: boolean;
  seLeRetieneIvaPequenoContribuyente: boolean;
  guardado: boolean;
}

/** Solo lectura: los datos fiscales se guardan con el formulario de Empresas y el de Proveedores (`secciones`). */
export class ApiLibroDeCompras {
  constructor(private readonly http: ClienteHttp) {}

  obtenerDatosFiscalesDeEmpresa(empresaId: string) {
    return this.http.obtener<DatosFiscalesDeEmpresa>(`/libro-de-compras/empresas/${empresaId}/datos-fiscales`);
  }

  obtenerDatosFiscalesDeProveedor(proveedorId: string) {
    return this.http.obtener<DatosFiscalesDeProveedor>(`/libro-de-compras/proveedores/${proveedorId}/datos-fiscales`);
  }
}

export const apiLibroDeCompras = new ApiLibroDeCompras(clienteHttp);
