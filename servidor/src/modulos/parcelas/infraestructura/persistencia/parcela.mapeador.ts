import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { ParcelaDto } from '../../aplicacion/dto/parcela.dto.js';
import { Parcela } from '../../dominio/parcela.js';
import { avisosDelPunto } from '../../dominio/reglas-de-parcela.js';
import type { parcelas } from './parcelas.tablas.js';

type Fila = typeof parcelas.$inferSelect;

/** Los nombres que trae la consulta de la localidad, el tipo y la madre. */
export interface NombresDeParcela {
  localidadNombre: string;
  tipoNombre: string;
  parcelaMadreCodigo: string | null;
}

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeParcela = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Parcela {
    return Parcela.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(parcela: Parcela): typeof parcelas.$inferInsert {
    const { id, empresaId, ...datos } = parcela.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila & NombresDeParcela): ParcelaDto {
    return { ...dto, avisos: avisosDelPunto(dto.latitud, dto.longitud) };
  },
};
