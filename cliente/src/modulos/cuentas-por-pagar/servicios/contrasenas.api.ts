import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  ConsultaDeContrasenas,
  ContrasenaCreada,
  DatosDeContrasena,
  DocumentosDisponibles,
  PaginaDeContrasenas,
} from './tipos-de-contrasenas';

export type * from './tipos-de-contrasenas';

const RUTA = '/cuentas-por-pagar/contrasenas';

export class ApiContrasenas {
  constructor(private readonly http: ClienteHttp) {}

  listar(consulta: ConsultaDeContrasenas) {
    return this.http.obtener<PaginaDeContrasenas>(RUTA, { ...consulta });
  }

  /** Lo que el proveedor tiene para meter en una contraseña nueva. */
  disponibles(proveedorId: string) {
    return this.http.obtener<DocumentosDisponibles>(`${RUTA}/disponibles`, { proveedorId });
  }

  crear(datos: DatosDeContrasena) {
    return this.http.crear<ContrasenaCreada>(RUTA, datos);
  }
}

export const apiContrasenas = new ApiContrasenas(clienteHttp);
