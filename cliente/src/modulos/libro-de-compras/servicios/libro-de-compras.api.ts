import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export type TipoDePersona = 'individual' | 'juridica';
export type RegimenDeIva =
  | 'general'
  | 'pequeno_contribuyente'
  | 'pequeno_contribuyente_electronico'
  | 'contribuyente_agropecuario'
  | 'primario_pecuario'
  | 'no_afiliado';
export type RegimenDeIsrDeEmpresa = 'utilidades' | 'opcional_simplificado' | 'exento';
export type AgenteDeRetencionDeIva = 'ninguno' | 'exportador' | 'contribuyente_especial' | 'sector_publico' | 'otro';
export type RegimenDeIvaDeProveedor =
  | 'general'
  | 'pequeno_contribuyente'
  | 'primario'
  | 'pecuario'
  | 'sin_inscripcion'
  | 'no_domiciliado'
  | 'pequeno_contribuyente_electronico'
  | 'contribuyente_agropecuario';
export type RegimenDeIsrDeProveedor = 'utilidades' | 'opcional_simplificado' | 'no_domiciliado' | 'exento';

/** Una vigencia del historial fiscal de la empresa; `vigenteHasta` es el último mes incluido (nulo: sigue vigente). */
export interface VigenciaFiscal {
  id: string;
  /** Nulo: «desde el inicio» (la base, que no se quita). */
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  tipoDePersona: TipoDePersona;
  regimenIva: RegimenDeIva;
  regimenIsr: RegimenDeIsrDeEmpresa | null;
  agenteDeRetencionIva: AgenteDeRetencionDeIva;
  esAgenteDeRetencionIsr: boolean;
  /** Hay documentos vigentes en los meses de esta vigencia: no se puede quitar. */
  conDocumentos: boolean;
}

/** Datos fiscales de una empresa hoy y su historial; sin `guardado` el tipo de persona es nulo (se escoge). */
export interface DatosFiscalesDeEmpresa {
  empresaId: string;
  guardado: boolean;
  vigenteDesde: string | null;
  tipoDePersona: TipoDePersona | null;
  regimenIva: RegimenDeIva;
  regimenIsr: RegimenDeIsrDeEmpresa | null;
  agenteDeRetencionIva: AgenteDeRetencionDeIva;
  esAgenteDeRetencionIsr: boolean;
  historial: VigenciaFiscal[];
}

/** Datos fiscales de un proveedor; `guardado` es falso si el servidor devuelve los valores por omisión. */
export interface DatosFiscalesDeProveedor {
  proveedorId: string;
  regimenIva: RegimenDeIvaDeProveedor;
  regimenIsr: RegimenDeIsrDeProveedor | null;
  esAgenteDeRetencionIva: boolean;
  seLeRetieneIva: boolean;
  seLeRetieneIsr: boolean;
  seLeRetieneIvaPequenoContribuyente: boolean;
  guardado: boolean;
}

/** Lectura de los datos fiscales y baja de vigencias; se guardan con el formulario de Empresas y el de Proveedores (`secciones`). */
export class ApiLibroDeCompras {
  constructor(private readonly http: ClienteHttp) {}

  obtenerDatosFiscalesDeEmpresa(empresaId: string) {
    return this.http.obtener<DatosFiscalesDeEmpresa>(`/libro-de-compras/empresas/${empresaId}/datos-fiscales`);
  }

  quitarVigenciaFiscalDeEmpresa(empresaId: string, vigenciaId: string) {
    return this.http.eliminar(`/libro-de-compras/empresas/${empresaId}/datos-fiscales/vigencias/${vigenciaId}`);
  }

  obtenerDatosFiscalesDeProveedor(proveedorId: string) {
    return this.http.obtener<DatosFiscalesDeProveedor>(`/libro-de-compras/proveedores/${proveedorId}/datos-fiscales`);
  }
}

export const apiLibroDeCompras = new ApiLibroDeCompras(clienteHttp);
