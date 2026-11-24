import { clienteHttp, ErrorApi, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export type CasoDeInicio = 'desde_la_carga' | 'posterior';

/** El inicio de la contabilidad de la empresa. */
export interface InicioContable {
  /** `AAAA-MM-DD`. */
  fecha: string;
  caso: CasoDeInicio;
  mascara: string;
  plantilla: string | null;
  firmaRepresentante: string | null;
  firmaContador: string | null;
  registroDelContador: string | null;
}

export class ApiInicio {
  constructor(private readonly http: ClienteHttp) {}

  /** El inicio, o `null` si la empresa todavía no inició su contabilidad. */
  async obtener(): Promise<InicioContable | null> {
    try {
      return await this.http.obtener<InicioContable>('/contabilidad/inicio');
    } catch (error) {
      if (error instanceof ErrorApi && error.estado === 404) return null;
      throw error;
    }
  }

  guardar(datos: InicioContable) {
    return this.http.reemplazar<InicioContable>('/contabilidad/inicio', datos);
  }
}

export const apiInicio = new ApiInicio(clienteHttp);
