import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

/** Un usuario de la empresa al que se le pueden asignar bodegas. */
export interface UsuarioParaAccesos {
  usuarioId: string;
  usuario: string;
  nombres: string;
  apellidos: string;
  roles: string[];
  /** Ya ve todas las bodegas por su permiso: no necesita asignaciones. */
  veTodas: boolean;
}

/** Una bodega de la empresa (también inactiva) con quiénes tienen acceso. */
export interface BodegaParaAsignar {
  id: string;
  codigo: string;
  nombre: string;
  localidadNombre: string | null;
  activo: boolean;
  usuarioIds: string[];
}

/** Un usuario que tiene acceso a una bodega. */
export interface UsuarioConAcceso {
  usuarioId: string;
  usuario: string;
}

const RUTA = '/inventarios/bodegas';

export class ApiAccesosABodegas {
  constructor(private readonly http: ClienteHttp) {}

  listarBodegas() {
    return this.http.obtener<BodegaParaAsignar[]>(`${RUTA}/accesos/bodegas`);
  }

  listarUsuarios() {
    return this.http.obtener<UsuarioParaAccesos[]>(`${RUTA}/accesos/usuarios`);
  }

  /** Los ids de todas las bodegas del usuario. */
  obtenerDeUsuario(usuarioId: string) {
    return this.http.obtener<string[]>(`${RUTA}/accesos/${usuarioId}`);
  }

  /** Deja al usuario con exactamente estas bodegas. */
  reemplazarDeUsuario(usuarioId: string, bodegaIds: string[]) {
    return this.http.reemplazar<{ bodegaIds: string[] }>(`${RUTA}/accesos/${usuarioId}`, { bodegaIds });
  }

  usuariosDeBodega(bodegaId: string) {
    return this.http.obtener<UsuarioConAcceso[]>(`${RUTA}/${bodegaId}/usuarios`);
  }
}

export const apiAccesosABodegas = new ApiAccesosABodegas(clienteHttp);
