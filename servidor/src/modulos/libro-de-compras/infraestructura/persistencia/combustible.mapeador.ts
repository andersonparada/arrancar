import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { CombustibleDto } from '../../aplicacion/dto/combustible.dto.js';
import { Combustible } from '../../dominio/combustible.js';
import type { combustibles } from './combustibles.tablas.js';

type Fila = typeof combustibles.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeCombustible = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Combustible {
    return Combustible.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(combustible: Combustible): typeof combustibles.$inferInsert {
    const { id, empresaId, ...datos } = combustible.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila): CombustibleDto {
    return dto;
  },
};
