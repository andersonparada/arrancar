import { api } from './cliente-http';

export interface CuentaPlataforma {
  id: string;
  nombre: string;
  activa: boolean;
  totalEmpresas: number;
  creadoEn: string;
}

export interface EstadoModulo {
  clave: string;
  nombre: string;
  descripcion: string;
  esencial: boolean;
  dependeDe: string[];
  activo: boolean;
}

export interface AltaCuenta {
  nombreCuenta: string;
  empresa: { nombre: string; nit?: string };
  propietario: {
    nombres: string;
    apellidos: string;
    usuario?: string;
    correo: string | null;
    contrasena?: string;
  };
  modulos: string[];
}

export interface ResultadoAltaCuenta {
  propietario: { id: string; usuario: string; existente: boolean };
}

export interface EntradaBitacora {
  id: string;
  accion: string;
  direccionIp: string | null;
  creadoEn: string;
  usuarioNombre: string;
  empresaNombre: string | null;
}

export const plataformaApi = {
  listarCuentas: () => api.obtener<CuentaPlataforma[]>('/plataforma/cuentas'),
  crearCuenta: (datos: AltaCuenta) => api.crear<ResultadoAltaCuenta>('/plataforma/cuentas', datos),
  actualizarCuenta: (id: string, datos: { nombre?: string; activa?: boolean }) =>
    api.modificar<void>(`/plataforma/cuentas/${id}`, datos),
  catalogoModulos: () => api.obtener<EstadoModulo[]>('/plataforma/modulos'),
  modulosDeCuenta: (id: string) => api.obtener<EstadoModulo[]>(`/plataforma/cuentas/${id}/modulos`),
  activarModulo: (id: string, clave: string) => api.reemplazar<EstadoModulo[]>(`/plataforma/cuentas/${id}/modulos/${clave}`),
  desactivarModulo: (id: string, clave: string) => api.eliminar<EstadoModulo[]>(`/plataforma/cuentas/${id}/modulos/${clave}`),
  bitacora: () => api.obtener<EntradaBitacora[]>('/plataforma/bitacora'),
};
