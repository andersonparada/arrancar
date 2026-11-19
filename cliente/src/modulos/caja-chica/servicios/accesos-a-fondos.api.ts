import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

export interface UsuarioParaAccesosAFondos {
  usuarioId: string;
  usuario: string;
  nombres: string;
  apellidos: string;
  roles: string[];
  /** Ya ve todos los fondos por su acceso total o por `ver-todos`: no necesita asignaciones. */
  veTodos: boolean;
}

export interface FondoParaAsignar {
  id: string;
  nombre: string;
  estado: 'abierto' | 'cerrado';
  usuarioIds: string[];
}

const RUTA = '/caja-chica/accesos-a-fondos';

/** Quién ve cada fondo (permiso `fondos.asignar`). */
export class ApiAccesosAFondos {
  constructor(private readonly http: ClienteHttp) {}

  listarFondos() {
    return this.http.obtener<FondoParaAsignar[]>(`${RUTA}/fondos`);
  }

  listarUsuarios() {
    return this.http.obtener<UsuarioParaAccesosAFondos[]>(`${RUTA}/usuarios`);
  }

  /** Los ids de todos los fondos del usuario. */
  obtenerDeUsuario(usuarioId: string) {
    return this.http.obtener<string[]>(`${RUTA}/${usuarioId}`);
  }

  /** Deja al usuario con exactamente estos fondos. */
  reemplazarDeUsuario(usuarioId: string, fondoIds: string[]) {
    return this.http.reemplazar<{ fondoIds: string[] }>(`${RUTA}/${usuarioId}`, { fondoIds });
  }
}

export const apiAccesosAFondos = new ApiAccesosAFondos(clienteHttp);
