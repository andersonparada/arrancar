import { clienteHttp, type ClienteHttp } from './cliente-http';

export type NivelConfiguracion = 'instalacion' | 'cuenta' | 'empresa';
export type NivelEditable = Exclude<NivelConfiguracion, 'instalacion'>;

export interface VariableConfiguracion {
  clave: string;
  descripcion: string;
  niveles: NivelConfiguracion[];
  predeterminado: unknown;
  valores: Partial<Record<NivelConfiguracion, unknown>>;
  efectivo: unknown;
  origen: NivelConfiguracion | 'predeterminado';
}

export class ApiConfiguracion {
  constructor(private readonly http: ClienteHttp) {}

  listar() {
    return this.http.obtener<VariableConfiguracion[]>('/configuracion');
  }

  establecer(clave: string, nivel: NivelEditable, valor: unknown) {
    return this.http.reemplazar<void>(`/configuracion/${encodeURIComponent(clave)}`, { nivel, valor });
  }

  restablecer(clave: string, nivel: NivelEditable) {
    return this.http.eliminar(`/configuracion/${encodeURIComponent(clave)}?nivel=${nivel}`);
  }
}

export const apiConfiguracion = new ApiConfiguracion(clienteHttp);
