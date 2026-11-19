import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type { AjustesDelAviso, AjustesDelAvisoConAyuda } from './tipos-de-avisos-de-pago';

const RUTA = '/cuentas-por-pagar/avisos-de-pago/ajustes';

/** Los ajustes de los avisos de pago por correo de la empresa activa. */
export class ApiAvisosDePago {
  constructor(private readonly http: ClienteHttp) {}

  ajustes() {
    return this.http.obtener<AjustesDelAvisoConAyuda>(RUTA);
  }

  guardarAjustes(ajustes: AjustesDelAviso) {
    return this.http.reemplazar<AjustesDelAviso>(RUTA, ajustes);
  }
}

export const apiAvisosDePago = new ApiAvisosDePago(clienteHttp);
