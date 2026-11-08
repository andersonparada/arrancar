import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { CausaDeAnulacionDeDocumento } from '../../../core/contratos/libro-de-compras.contratos.js';

/**
 * Lo que Cuentas por pagar le ordena a Libro de compras (por el mediador, dentro de la transacción en curso). Libro de
 * compras bloquea su documento, así que estas órdenes van **antes** de bloquear la fila de aquí (orden de bloqueo de §4),
 * salvo `eliminar`, que va después de borrar la fila de aquí porque la llave lo exige.
 */
export interface LibroDeCompras {
  /** Marca el documento como procesado (al autorizar: ya no se elimina, solo se anula) o lo devuelve a pendiente. */
  marcarProcesado(operador: Operador, documentoId: string, procesado: boolean): Promise<void>;
  /**
   * Anula el registro del documento. Libro de compras no devuelve el aviso: Cuentas por pagar hace lo suyo aparte.
   * Responde los avisos que no bloquean (período declarado, retenciones por resolver).
   */
  anular(operador: Operador, orden: OrdenDeAnulacion): Promise<string[]>;
  /** Elimina el documento; sus reglas pueden rechazarlo y entonces se deshace todo. */
  eliminar(operador: Operador, documentoId: string): Promise<void>;
}

export interface OrdenDeAnulacion {
  documentoId: string;
  causa: CausaDeAnulacionDeDocumento;
  motivo: string;
}
