import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { ChequeraDto } from '../../aplicacion/dto/chequera.dto.js';
import { Chequera } from '../../dominio/chequera.js';
import type { chequeras } from './chequeras.tablas.js';

type Fila = typeof chequeras.$inferSelect;
type Conteos = Pick<ChequeraDto, 'cuentaBancariaNombre' | 'disponibles' | 'emitidos' | 'anulados'>;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeChequera = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Chequera {
    return Chequera.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(chequera: Chequera): typeof chequeras.$inferInsert {
    const { id, empresaId, ...datos } = chequera.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila & Conteos): ChequeraDto {
    return dto;
  },
};
