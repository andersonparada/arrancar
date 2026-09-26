import { api } from './cliente-http';

export interface Apariencia {
  nombreAplicacion: string;
  colorPrincipal: string;
  colorAcento: string;
  urlLogo: string | null;
}

export type DatosApariencia = Omit<Apariencia, 'urlLogo'>;

export const aparienciaApi = {
  obtener: () => api.obtener<Apariencia>('/apariencia'),
  guardar: (datos: DatosApariencia) => api.reemplazar<Apariencia>('/plataforma/apariencia', datos),
  restablecer: () => api.eliminar<Apariencia>('/plataforma/apariencia'),
  cambiarLogo: (archivo: File) => {
    const formulario = new FormData();
    formulario.append('logo', archivo);
    return api.reemplazar<Apariencia>('/plataforma/apariencia/logo', formulario);
  },
  quitarLogo: () => api.eliminar<Apariencia>('/plataforma/apariencia/logo'),
};
