import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export interface DatosFiscales {
  empresaId: string;
  razonSocial: string | null;
  nombreComercial: string | null;
}

export interface CargaInicial {
  empresaId: string;
  /** `aaaa-mm-dd`; sin fecha mientras nadie la registre. */
  fechaDeInicio: string | null;
  cerrada: boolean;
  cerradaEn: string | null;
  cerradaPor: string | null;
}

export interface DatosDeFiscales {
  razonSocial: string | null;
  nombreComercial: string | null;
}

export class ApiDatosDeEmpresa {
  constructor(private readonly http: ClienteHttp) {}

  obtenerDatosFiscales(empresaId: string) {
    return this.http.obtener<DatosFiscales>(`/empresas/${empresaId}/datos-fiscales`);
  }

  guardarDatosFiscales(empresaId: string, datos: DatosDeFiscales) {
    return this.http.reemplazar<DatosFiscales>(`/empresas/${empresaId}/datos-fiscales`, datos);
  }

  obtenerCargaInicial(empresaId: string) {
    return this.http.obtener<CargaInicial>(`/empresas/${empresaId}/carga-inicial`);
  }

  establecerFechaDeInicio(empresaId: string, fechaDeInicio: string) {
    return this.http.reemplazar<CargaInicial>(`/empresas/${empresaId}/carga-inicial`, { fechaDeInicio });
  }

  cerrarCargaInicial(empresaId: string) {
    return this.http.crear<CargaInicial>(`/empresas/${empresaId}/carga-inicial/cerrar`);
  }

  reabrirCargaInicial(empresaId: string, motivo: string) {
    return this.http.crear<CargaInicial>(`/empresas/${empresaId}/carga-inicial/reabrir`, { motivo });
  }
}

export const apiDatosDeEmpresa = new ApiDatosDeEmpresa(clienteHttp);
