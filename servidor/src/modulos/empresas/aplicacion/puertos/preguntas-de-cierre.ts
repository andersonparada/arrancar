import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { RevisionDeCierreDeModulo } from '../../../core/contratos/empresas.contratos.js';

/**
 * Puerto para preguntar a todos los módulos activos qué encontraron en la carga inicial antes de cerrarla, dentro de
 * la misma transacción. Devuelve solo a los que tienen algo que decir, en el orden de los módulos. El operador lleva
 * `empresaId` = la empresa de la carga.
 */
export interface PreguntasDeCierre {
  revisar(operador: Operador, datos: { empresaId: string; fechaDeInicio: string }): Promise<RevisionDeCierreDeModulo[]>;
}
