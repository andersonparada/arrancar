import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { LocalidadDto } from '../../aplicacion/dto/localidad.dto.js';
import { Localidad } from '../../dominio/localidad.js';
import type { localidades } from './localidades.tablas.js';

type Fila = typeof localidades.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeLocalidad = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Localidad {
    return Localidad.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(localidad: Localidad): typeof localidades.$inferInsert {
    const { id, empresaId, ...datos } = localidad.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({
    empresaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    ...dto
  }: Fila & Pick<LocalidadDto, 'tipoNombre'>): LocalidadDto {
    return dto;
  },
};
