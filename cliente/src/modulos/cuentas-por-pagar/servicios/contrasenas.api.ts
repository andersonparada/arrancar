import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import type {
  CambiosDeContrasena,
  ConsultaDeContrasenas,
  ContrasenaCreada,
  DatosDeContrasena,
  DocumentosDisponibles,
  FichaDeContrasena,
  ImpresionDeContrasena,
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

  obtener(id: string) {
    return this.http.obtener<FichaDeContrasena>(`${RUTA}/${id}`);
  }

  editar(id: string, cambios: CambiosDeContrasena) {
    return this.http.modificar<FichaDeContrasena>(`${RUTA}/${id}`, cambios);
  }

  agregarDocumentos(id: string, documentos: string[]) {
    return this.http.crear<FichaDeContrasena>(`${RUTA}/${id}/documentos`, { documentos });
  }

  quitarDocumento(id: string, documentoId: string, motivo: string) {
    return this.http.eliminar<FichaDeContrasena>(`${RUTA}/${id}/documentos/${documentoId}`, { motivo });
  }

  anular(id: string, motivo: string) {
    return this.http.crear<FichaDeContrasena>(`${RUTA}/${id}/anular`, { motivo });
  }

  /** La vista previa del papel: no cambia nada. */
  impresion(id: string) {
    return this.http.obtener<ImpresionDeContrasena>(`${RUTA}/${id}/impresion`);
  }

  /** Marca la impresión (la primera es el original; las siguientes salen como «REIMPRESIÓN») y trae el papel. */
  registrarImpresion(id: string) {
    return this.http.crear<ImpresionDeContrasena>(`${RUTA}/${id}/impresiones`);
  }
}

export const apiContrasenas = new ApiContrasenas(clienteHttp);
