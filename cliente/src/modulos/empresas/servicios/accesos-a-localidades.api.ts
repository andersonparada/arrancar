import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';

/** Un usuario de la empresa al que se le pueden asignar localidades. */
export interface UsuarioParaAccesos {
  usuarioId: string;
  usuario: string;
  nombres: string;
  apellidos: string;
  roles: string[];
  /** Ya ve todas las localidades por su permiso: no necesita asignaciones. */
  veTodas: boolean;
}

/** Una localidad de la empresa (también inactiva) con quiénes tienen acceso. */
export interface LocalidadParaAsignar {
  id: string;
  codigo: string;
  nombre: string;
  tipoNombre: string | null;
  activo: boolean;
  usuarioIds: string[];
}

/** Un usuario que tiene acceso a una localidad. */
export interface UsuarioConAcceso {
  usuarioId: string;
  usuario: string;
}

const RUTA = '/empresas/localidades';

export class ApiAccesosALocalidades {
  constructor(private readonly http: ClienteHttp) {}

  listarLocalidades() {
    return this.http.obtener<LocalidadParaAsignar[]>(`${RUTA}/accesos/localidades`);
  }

  listarUsuarios() {
    return this.http.obtener<UsuarioParaAccesos[]>(`${RUTA}/accesos/usuarios`);
  }

  /** Los ids de todas las localidades del usuario. */
  obtenerDeUsuario(usuarioId: string) {
    return this.http.obtener<string[]>(`${RUTA}/accesos/${usuarioId}`);
  }

  /** Deja al usuario con exactamente estas localidades. */
  reemplazarDeUsuario(usuarioId: string, localidadIds: string[]) {
    return this.http.reemplazar<{ localidadIds: string[] }>(`${RUTA}/accesos/${usuarioId}`, { localidadIds });
  }

  usuariosDeLocalidad(localidadId: string) {
    return this.http.obtener<UsuarioConAcceso[]>(`${RUTA}/${localidadId}/usuarios`);
  }
}

export const apiAccesosALocalidades = new ApiAccesosALocalidades(clienteHttp);
