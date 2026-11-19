import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { Costo, type CostoId } from '../../dominio/costo.js';
import type { costos } from './costos.tablas.js';

type Fila = typeof costos.$inferSelect;

/** Traduce entre la fila (monto con dos decimales) y la entidad (centavos enteros); sin marcas de tiempo ni autoría. */
export const mapeadorDeCosto = {
  aEntidad({ id, empresaId, monto, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Costo {
    return Costo.reconstruir({
      ...campos,
      id: Identificador.desde(id) as CostoId,
      empresaId: Identificador.desde(empresaId),
      montoCentavos: aCentavos(monto),
    });
  },

  aFila(costo: Costo): typeof costos.$inferInsert {
    const { id, empresaId, montoCentavos, ...datos } = costo.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor, monto: deCentavos(montoCentavos) };
  },
};
