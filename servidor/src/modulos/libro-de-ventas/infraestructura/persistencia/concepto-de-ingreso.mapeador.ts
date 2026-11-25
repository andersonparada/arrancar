import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { ConceptoDeIngresoDto } from '../../aplicacion/dto/concepto-de-ingreso.dto.js';
import { ConceptoDeIngreso } from '../../dominio/concepto-de-ingreso.js';
import type { conceptosDeIngreso } from './conceptos-de-ingreso.tablas.js';

type Fila = typeof conceptosDeIngreso.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeConceptoDeIngreso = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): ConceptoDeIngreso {
    return ConceptoDeIngreso.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(conceptoDeIngreso: ConceptoDeIngreso): typeof conceptosDeIngreso.$inferInsert {
    const { id, empresaId, ...datos } = conceptoDeIngreso.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila): ConceptoDeIngresoDto {
    return dto;
  },
};
