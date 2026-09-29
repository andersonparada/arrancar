import { clienteHttp, type ClienteHttp } from './cliente-http';

export interface EmpresaDisponible {
  id: string;
  nombre: string;
  cuentaId: string;
  cuentaNombre: string;
}

export interface ResumenSesion {
  usuario: { id: string; usuario: string; nombre: string; esSuperacceso: boolean };
  empresa: EmpresaDisponible | null;
  /** Nombres de los roles del usuario en la cuenta; vacío si solo tiene permisos directos. */
  roles: string[];
  modulosActivos: string[];
  permisos: string[];
  /** Valores efectivos de las variables de configuración públicas. */
  configuracion: Record<string, unknown>;
  empresasDisponibles: EmpresaDisponible[];
}

export class ApiSesion {
  constructor(private readonly http: ClienteHttp) {}

  iniciarSesion(usuario: string, contrasena: string) {
    return this.http.crear<void>('/autenticacion/iniciar-sesion', { usuario, contrasena });
  }

  cerrarSesion() {
    return this.http.crear<void>('/autenticacion/cerrar-sesion');
  }

  obtener() {
    return this.http.obtener<ResumenSesion>('/sesion');
  }

  cambiarEmpresa(empresaId: string) {
    return this.http.reemplazar<ResumenSesion>('/sesion/empresa-activa', { empresaId });
  }
}

export const apiSesion = new ApiSesion(clienteHttp);
