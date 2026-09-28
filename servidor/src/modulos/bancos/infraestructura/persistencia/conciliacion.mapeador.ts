import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Conciliacion } from '../../dominio/conciliacion.js';
import type { conciliaciones } from './conciliaciones.tablas.js';

type Fila = typeof conciliaciones.$inferSelect;

/** Traduce entre la fila de la tabla y la entidad. */
export const mapeadorDeConciliacion = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Conciliacion {
    return Conciliacion.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(conciliacion: Conciliacion): typeof conciliaciones.$inferInsert {
    const { id, empresaId, ...datos } = conciliacion.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },
};
