import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Bodega tal como lo manda el servidor. */
export interface Bodega {
  id: string;
  codigo: string;
  nombre: string;
  localidadId: string | null;
  /** Solo para mostrar: viene de la localidad que el usuario ve. */
  localidadNombre: string | null;
  responsable: string | null;
  responsableUsuarioId: string | null;
  activo: boolean;
}

export type DatosBodega = Omit<Bodega, 'id' | 'localidadNombre'>;

const RUTA = '/inventarios/bodegas';

export class ApiBodegas {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<Bodega[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<Bodega>(`${RUTA}/${id}`);
  }

  crear(datos: DatosBodega) {
    return this.http.crear<Bodega>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosBodega) {
    return this.http.reemplazar<Bodega>(`${RUTA}/${id}`, datos);
  }

  /** Falla con 409 si la bodega ya tiene documentos; en ese caso se inactiva. */
  eliminar(id: string) {
    return this.http.eliminar(`${RUTA}/${id}`);
  }
}

export const apiBodegas = new ApiBodegas(clienteHttp);
