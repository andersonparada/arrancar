import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Transferencia } from '../../dominio/transferencia.js';
import type { transferencias } from './transferencias.tablas.js';

type Fila = typeof transferencias.$inferSelect;

/** Traduce entre la fila de la tabla y la entidad. */
export const mapeadorDeTransferencia = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Transferencia {
    return Transferencia.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(transferencia: Transferencia): typeof transferencias.$inferInsert {
    const { id, empresaId, ...datos } = transferencia.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },
};
