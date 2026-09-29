import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { ConceptoDto } from '../../aplicacion/dto/concepto.dto.js';
import { Concepto } from '../../dominio/concepto.js';
import type { conceptos } from './conceptos.tablas.js';

type Fila = typeof conceptos.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeConcepto = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Concepto {
    return Concepto.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(concepto: Concepto): typeof conceptos.$inferInsert {
    const { id, empresaId, ...datos } = concepto.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila): ConceptoDto {
    return dto;
  },
};
