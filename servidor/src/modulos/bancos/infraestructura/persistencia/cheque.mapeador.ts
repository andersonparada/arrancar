import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { accionesDeCheque } from '../../aplicacion/acciones-posibles.js';
import type { ChequeDto } from '../../aplicacion/dto/cheque.dto.js';
import { Cheque } from '../../dominio/cheque.js';
import type { cheques } from './cheques.tablas.js';
import { hechosDeLaFila } from './hechos-de-movimiento.js';

type Fila = typeof cheques.$inferSelect;
type HechosDelMovimiento = Parameters<typeof hechosDeLaFila>[0];

/** Los hechos del movimiento del cheque, si tiene uno (la consulta lo trae con `leftJoin`). */
export function hechosDelMovimientoDelCheque(movimientoId: string | null, hechos: HechosDelMovimiento) {
  return movimientoId ? hechosDeLaFila(hechos) : null;
}

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

  aDto({
    empresaId: _empresaId,
    creadoEn: _creadoEn,
    actualizadoEn: _actualizadoEn,
    creadoPor: _creadoPor,
    actualizadoPor: _actualizadoPor,
    hechosDelMovimiento,
    anuladoEn,
    ...dto
  }: Fila & { hechosDelMovimiento: HechosDelMovimiento }): ChequeDto {
    const movimiento = hechosDelMovimientoDelCheque(dto.movimientoId, hechosDelMovimiento);
    return {
      ...dto,
      anuladoEn: anuladoEn ? anuladoEn.toISOString() : null,
      ...accionesDeCheque(dto.estado, movimiento),
    };
  },
};
