import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Mejora, type MejoraId } from '../../dominio/mejora.js';
import type { mejoras } from './mejoras.tablas.js';

type Fila = typeof mejoras.$inferSelect;

/** Traduce entre la fila y la entidad; sin marcas de tiempo ni autoría. */
export const mapeadorDeMejora = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Mejora {
    return Mejora.reconstruir({
      ...campos,
      id: Identificador.desde(id) as MejoraId,
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(mejora: Mejora): typeof mejoras.$inferInsert {
    const { id, empresaId, ...datos } = mejora.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },
};
