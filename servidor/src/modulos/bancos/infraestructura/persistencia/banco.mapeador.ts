import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { BancoDto } from '../../aplicacion/dto/banco.dto.js';
import { Banco } from '../../dominio/banco.js';
import type { bancos } from './bancos.tablas.js';

type Fila = typeof bancos.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeBanco = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Banco {
    return Banco.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(banco: Banco): typeof bancos.$inferInsert {
    const { id, empresaId, ...datos } = banco.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila): BancoDto {
    return dto;
  },
};
