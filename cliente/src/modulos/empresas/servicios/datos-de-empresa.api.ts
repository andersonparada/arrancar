import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { CargaInicial, CierreGuardado, EntradaDelHistorial, RevisionDeCierre } from './cierre-de-carga.tipos';

export type { CargaInicial } from './cierre-de-carga.tipos';

export interface DatosFiscales {
  empresaId: string;
  razonSocial: string | null;
  nombreComercial: string | null;
}

export interface DatosDeFiscales {
  razonSocial: string | null;
  nombreComercial: string | null;
}

const rutaDeCarga = (empresaId: string) => `/empresas/${empresaId}/carga-inicial`;

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

  revisionDeCierre(empresaId: string) {
    return this.http.obtener<RevisionDeCierre>(`${rutaDeCarga(empresaId)}/revision-de-cierre`);
  }

  /** Con el motivo (si se pidió) y la huella de la revisión que vio quien cierra. */
  cerrarCargaInicial(empresaId: string, cuerpo: { motivo?: string; huella?: string } = {}) {
    return this.http.crear<CargaInicial>(`${rutaDeCarga(empresaId)}/cerrar`, cuerpo);
  }

  historialDeCarga(empresaId: string) {
    return this.http.obtener<EntradaDelHistorial[]>(`${rutaDeCarga(empresaId)}/historial`);
  }

  cierreDeCarga(empresaId: string, cierreId: string) {
    return this.http.obtener<CierreGuardado>(`${rutaDeCarga(empresaId)}/cierres/${cierreId}`);
  }

  exportarCierre(empresaId: string, cierreId: string) {
    return this.http.descargar(`${rutaDeCarga(empresaId)}/cierres/${cierreId}/exportar`);
  }

  subirBalanceDeApertura(empresaId: string, archivo: File) {
    return this.http.subir<CargaInicial>(`${rutaDeCarga(empresaId)}/balance-de-apertura`, archivo);
  }

  quitarBalanceDeApertura(empresaId: string) {
    return this.http.eliminar<CargaInicial>(`${rutaDeCarga(empresaId)}/balance-de-apertura`);
  }

  /** Dirección del PDF para el visor y para abrirlo en otra pestaña. */
  direccionDelBalanceDeApertura(empresaId: string): string {
    return `/api${rutaDeCarga(empresaId)}/balance-de-apertura`;
  }

  reabrirCargaInicial(empresaId: string, motivo: string) {
    return this.http.crear<CargaInicial>(`/empresas/${empresaId}/carga-inicial/reabrir`, { motivo });
  }
}

export const apiDatosDeEmpresa = new ApiDatosDeEmpresa(clienteHttp);
