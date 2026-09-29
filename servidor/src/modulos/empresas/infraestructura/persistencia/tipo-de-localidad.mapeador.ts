import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { TipoDeLocalidadDto } from '../../aplicacion/dto/tipo-de-localidad.dto.js';
import { TipoDeLocalidad } from '../../dominio/tipo-de-localidad.js';
import type { tiposDeLocalidad } from './tipos-de-localidad.tablas.js';

type Fila = typeof tiposDeLocalidad.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeTipoDeLocalidad = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): TipoDeLocalidad {
    return TipoDeLocalidad.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(tipoDeLocalidad: TipoDeLocalidad): typeof tiposDeLocalidad.$inferInsert {
    const { id, empresaId, ...datos } = tipoDeLocalidad.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila): TipoDeLocalidadDto {
    return dto;
  },
};
