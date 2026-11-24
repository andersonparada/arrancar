import type { ValorDeInmuebleDto } from '../../aplicacion/dto/valor-de-inmueble.dto.js';
import type { ValorDeInmueble } from '../../dominio/valor-de-inmueble.js';
import type { valoresDeInmueble } from './valores-de-inmueble.tablas.js';

type Fila = typeof valoresDeInmueble.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeValorDeInmueble = {
  aFila(valor: ValorDeInmueble): typeof valoresDeInmueble.$inferInsert {
    const { id, empresaId, inmuebleId, ...datos } = valor.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor, inmuebleId: inmuebleId.valor };
  },

  aDto({ empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...dto }: Fila): ValorDeInmuebleDto {
    return dto;
  },
};
