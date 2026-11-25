import type { InicioContable } from '../../dominio/inicio.js';

export type BloqueoDelInicio = 'compartido' | 'exclusivo';

/** Guarda y recupera el inicio de la contabilidad de la empresa activa (una fila por empresa). */
export interface RepositorioInicios {
  /**
   * @param bloqueo `compartido` al crear cuentas (leen la máscara) y `exclusivo` al guardar el inicio (la cambian):
   * así una máscara nueva y la primera cuenta no se cruzan sin verse.
   */
  obtener(bloqueo?: BloqueoDelInicio): Promise<InicioContable | null>;
  agregar(inicio: InicioContable): Promise<void>;
  guardar(inicio: InicioContable): Promise<void>;
}
