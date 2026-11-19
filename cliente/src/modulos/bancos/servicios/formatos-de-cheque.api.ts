import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  ClaveDePlantilla,
  DatosDeFormatoDeCheque,
  FormatoDeChequeDetalle,
  FormatoDeChequeGuardado,
  PlantillaDeCheque,
  PruebaDeAlineacion,
} from './tipos-de-formatos-de-cheque';

const RUTA = '/bancos/formatos-de-cheque';

/** Formatos de impresión de cheques de la cuenta: Administración, sin Excel (las posiciones no se capturan en una hoja). */
export class ApiFormatosDeCheque {
  constructor(private readonly http: ClienteHttp) {}

  listar() {
    return this.http.obtener<FormatoDeChequeGuardado[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<FormatoDeChequeDetalle>(`${RUTA}/${id}`);
  }

  /** Las plantillas de fábrica, con sus medidas aproximadas. */
  plantillas() {
    return this.http.obtener<PlantillaDeCheque[]>(`${RUTA}/plantillas`);
  }

  crear(datos: DatosDeFormatoDeCheque) {
    return this.http.crear<FormatoDeChequeGuardado>(RUTA, datos);
  }

  /** Cambiar la plantilla o los ajustes anula la prueba de alineación. */
  actualizar(id: string, datos: DatosDeFormatoDeCheque) {
    return this.http.modificar<FormatoDeChequeGuardado>(`${RUTA}/${id}`, datos);
  }

  inactivar(id: string) {
    return this.http.crear<FormatoDeChequeGuardado>(`${RUTA}/${id}/inactivar`);
  }

  reactivar(id: string) {
    return this.http.crear<FormatoDeChequeGuardado>(`${RUTA}/${id}/reactivar`);
  }

  /** «La prueba quedó alineada». */
  marcarProbado(id: string) {
    return this.http.crear<FormatoDeChequeGuardado>(`${RUTA}/${id}/probado`);
  }

  /** Solo si ninguna chequera lo usa; el motivo queda en la auditoría. */
  eliminar(id: string, motivo: string) {
    return this.http.eliminar(`${RUTA}/${id}`, { motivo });
  }

  pruebaDeFormato(id: string) {
    return this.http.obtener<PruebaDeAlineacion>(`${RUTA}/${id}/prueba`);
  }

  pruebaDePlantilla(clave: ClaveDePlantilla) {
    return this.http.obtener<PruebaDeAlineacion>(`${RUTA}/plantillas/${clave}/prueba`);
  }
}

export const apiFormatosDeCheque = new ApiFormatosDeCheque(clienteHttp);
