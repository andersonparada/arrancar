import type { InicioContable } from '../../dominio/inicio.js';

/** Guarda y recupera el inicio de la contabilidad de la empresa activa (una fila por empresa). */
export interface RepositorioInicios {
  obtener(): Promise<InicioContable | null>;
  agregar(inicio: InicioContable): Promise<void>;
  guardar(inicio: InicioContable): Promise<void>;
}
