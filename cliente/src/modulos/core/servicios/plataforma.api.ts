import { clienteHttp, type ClienteHttp } from './cliente-http';

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

/** Panel de soporte: cuentas suscriptoras, sus módulos y la bitácora. */
export class ApiPlataforma {
  constructor(private readonly http: ClienteHttp) {}

  listarCuentas() {
    return this.http.obtener<CuentaPlataforma[]>('/plataforma/cuentas');
  }

  crearCuenta(datos: AltaCuenta) {
    return this.http.crear<ResultadoAltaCuenta>('/plataforma/cuentas', datos);
  }

  actualizarCuenta(id: string, datos: { nombre?: string; activa?: boolean }) {
    return this.http.modificar<void>(`/plataforma/cuentas/${id}`, datos);
  }

  catalogoModulos() {
    return this.http.obtener<EstadoModulo[]>('/plataforma/modulos');
  }

  modulosDeCuenta(id: string) {
    return this.http.obtener<EstadoModulo[]>(`/plataforma/cuentas/${id}/modulos`);
  }

  activarModulo(id: string, clave: string) {
    return this.http.reemplazar<EstadoModulo[]>(`/plataforma/cuentas/${id}/modulos/${clave}`);
  }

  desactivarModulo(id: string, clave: string) {
    return this.http.eliminar<EstadoModulo[]>(`/plataforma/cuentas/${id}/modulos/${clave}`);
  }

  bitacora() {
    return this.http.obtener<EntradaBitacora[]>('/plataforma/bitacora');
  }
}

export const apiPlataforma = new ApiPlataforma(clienteHttp);
