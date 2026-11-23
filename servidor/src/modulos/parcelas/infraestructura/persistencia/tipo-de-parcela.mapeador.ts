import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { TipoDeParcelaDto } from '../../aplicacion/dto/tipo-de-parcela.dto.js';
import { TipoDeParcela } from '../../dominio/tipo-de-parcela.js';
import type { tiposDeParcela } from './tipos-de-parcela.tablas.js';

type Fila = typeof tiposDeParcela.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeTipoDeParcela = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): TipoDeParcela {
    return TipoDeParcela.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(tipoDeParcela: TipoDeParcela): typeof tiposDeParcela.$inferInsert {
    const { id, empresaId, ...datos } = tipoDeParcela.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila): TipoDeParcelaDto {
    return dto;
  },
};
