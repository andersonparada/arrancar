import { clienteHttp, type ClienteHttp } from '@/modulos/core/servicios/cliente-http';
import { intercambioDe } from '@/modulos/core/servicios/intercambio';

/** Categoría tal como lo manda el servidor. */
export interface Categoria {
  id: string;
  nombre: string;
  tipoDeInventarioPorOmision:
    | 'mercaderia'
    | 'materia_prima'
    | 'suministros'
    | 'producto_en_proceso'
    | 'producto_terminado'
    | 'repuestos'
    | 'empaques';
  activo: boolean;
}

export type DatosCategoria = Omit<Categoria, 'id'>;

const RUTA = '/inventarios/categorias';

export class ApiCategorias {
  constructor(private readonly http: ClienteHttp) {}

  /** Exportar e importar en Excel. */
  get intercambio() {
    return intercambioDe(this.http, RUTA);
  }

  listar() {
    return this.http.obtener<Categoria[]>(RUTA);
  }

  obtener(id: string) {
    return this.http.obtener<Categoria>(`${RUTA}/${id}`);
  }

  crear(datos: DatosCategoria) {
    return this.http.crear<Categoria>(RUTA, datos);
  }

  actualizar(id: string, datos: DatosCategoria) {
    return this.http.reemplazar<Categoria>(`${RUTA}/${id}`, datos);
  }

  /** Solo si no tiene artículos; queda en la auditoría. */
  eliminar(id: string) {
    return this.http.eliminar(`${RUTA}/${id}`);
  }
}

export const apiCategorias = new ApiCategorias(clienteHttp);
