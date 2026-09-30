import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { ConceptoDeGastoDto } from '../../aplicacion/dto/concepto-de-gasto.dto.js';
import { ConceptoDeGasto } from '../../dominio/concepto-de-gasto.js';
import type { conceptosDeGasto } from './conceptos-de-gasto.tablas.js';

type Fila = typeof conceptosDeGasto.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeConceptoDeGasto = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): ConceptoDeGasto {
    return ConceptoDeGasto.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(conceptoDeGasto: ConceptoDeGasto): typeof conceptosDeGasto.$inferInsert {
    const { id, empresaId, ...datos } = conceptoDeGasto.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila): ConceptoDeGastoDto {
    return dto;
  },
};
