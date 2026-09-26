import { api } from './cliente-http';

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

export const configuracionApi = {
  listar: () => api.obtener<VariableConfiguracion[]>('/configuracion'),
  establecer: (clave: string, nivel: NivelEditable, valor: unknown) =>
    api.reemplazar<void>(`/configuracion/${encodeURIComponent(clave)}`, { nivel, valor }),
  restablecer: (clave: string, nivel: NivelEditable) =>
    api.eliminar(`/configuracion/${encodeURIComponent(clave)}?nivel=${nivel}`),
};
