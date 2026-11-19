import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { InmuebleDto } from '../../aplicacion/dto/inmueble.dto.js';
import { Inmueble } from '../../dominio/inmueble.js';
import type { inmuebles } from './inmuebles.tablas.js';

type Fila = typeof inmuebles.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeInmueble = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Inmueble {
    return Inmueble.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(inmueble: Inmueble): typeof inmuebles.$inferInsert {
    const { id, empresaId, ...datos } = inmueble.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({
    empresaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    ...dto
  }: Fila & Pick<InmuebleDto, 'localidadNombre'>): InmuebleDto {
    return dto;
  },
};
