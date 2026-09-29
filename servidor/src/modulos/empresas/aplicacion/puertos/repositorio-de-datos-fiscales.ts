import type { DatosFiscales } from '../../dominio/datos-fiscales.js';
import type { EmpresaId } from '../../dominio/empresa.js';

/** Guarda y recupera los datos fiscales de una empresa. */
export interface RepositorioDeDatosFiscales {
  buscar(empresaId: EmpresaId): Promise<DatosFiscales | null>;
  /** Crea la fila la primera vez y la reemplaza después. */
  guardar(datos: DatosFiscales): Promise<void>;
}
