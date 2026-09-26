import { api } from './cliente-http';

export interface EmpresaDisponible {
  id: string;
  nombre: string;
  cuentaId: string;
  cuentaNombre: string;
}

export interface ResumenSesion {
  usuario: { id: string; usuario: string; nombre: string; esSuperacceso: boolean };
  empresa: EmpresaDisponible | null;
  rolNombre: string | null;
  modulosActivos: string[];
  permisos: string[];
  /** Valores efectivos de las variables de configuración públicas. */
  configuracion: Record<string, unknown>;
  empresasDisponibles: EmpresaDisponible[];
}

export const sesionApi = {
  iniciarSesion: (usuario: string, contrasena: string) =>
    api.crear<void>('/autenticacion/iniciar-sesion', { usuario, contrasena }),
  cerrarSesion: () => api.crear<void>('/autenticacion/cerrar-sesion'),
  obtener: () => api.obtener<ResumenSesion>('/sesion'),
  cambiarEmpresa: (empresaId: string) => api.reemplazar<ResumenSesion>('/sesion/empresa-activa', { empresaId }),
};
