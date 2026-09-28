import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { ChequeDto } from '../../aplicacion/dto/cheque.dto.js';
import { Cheque } from '../../dominio/cheque.js';
import type { cheques } from './cheques.tablas.js';

type Fila = typeof cheques.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeCheque = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Cheque {
    return Cheque.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(cheque: Cheque): typeof cheques.$inferInsert {
    const { id, empresaId, ...datos } = cheque.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, anuladoEn, ...dto }: Fila): ChequeDto {
    return { ...dto, anuladoEn: anuladoEn ? anuladoEn.toISOString() : null };
  },
};
