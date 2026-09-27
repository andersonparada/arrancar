import { clienteHttp, type ClienteHttp } from './cliente-http';

export interface Apariencia {
  nombreAplicacion: string;
  colorPrincipal: string;
  colorAcento: string;
  urlLogo: string | null;
}

export type DatosApariencia = Omit<Apariencia, 'urlLogo'>;

export class ApiApariencia {
  constructor(private readonly http: ClienteHttp) {}

  obtener() {
    return this.http.obtener<Apariencia>('/apariencia');
  }

  guardar(datos: DatosApariencia) {
    return this.http.reemplazar<Apariencia>('/plataforma/apariencia', datos);
  }

  restablecer() {
    return this.http.eliminar<Apariencia>('/plataforma/apariencia');
  }

  cambiarLogo(archivo: File) {
    const formulario = new FormData();
    formulario.append('logo', archivo);
    return this.http.reemplazar<Apariencia>('/plataforma/apariencia/logo', formulario);
  }

  quitarLogo() {
    return this.http.eliminar<Apariencia>('/plataforma/apariencia/logo');
  }
}

export const apiApariencia = new ApiApariencia(clienteHttp);
