import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Activo, type ActivoId } from '../../dominio/activo.js';
import type { activos } from './activos.tablas.js';

type Fila = typeof activos.$inferSelect;

/** Traduce entre la fila de la tabla y la entidad (las marcas de tiempo y la autoría no entran en el dominio). */
export const mapeadorDeActivo = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Activo {
    return Activo.reconstruir({
      ...campos,
      id: Identificador.desde(id) as ActivoId,
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(activo: Activo): typeof activos.$inferInsert {
    const { id, empresaId, ...datos } = activo.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },
};
