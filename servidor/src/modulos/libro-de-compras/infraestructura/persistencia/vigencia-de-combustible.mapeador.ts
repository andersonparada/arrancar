import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { VigenciaDeCombustibleDto } from '../../aplicacion/dto/vigencia-de-combustible.dto.js';
import { VigenciaDeCombustible } from '../../dominio/vigencia-de-combustible.js';
import type { vigenciasDeCombustible } from './vigencias-de-combustible.tablas.js';

type Fila = typeof vigenciasDeCombustible.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeVigenciaDeCombustible = {
  aEntidad({
    id,
    empresaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    ...campos
  }: Fila): VigenciaDeCombustible {
    return VigenciaDeCombustible.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(vigenciaDeCombustible: VigenciaDeCombustible): typeof vigenciasDeCombustible.$inferInsert {
    const { id, empresaId, ...datos } = vigenciaDeCombustible.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({
    empresaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    ...dto
  }: Fila & Pick<VigenciaDeCombustibleDto, 'combustibleNombre'>): VigenciaDeCombustibleDto {
    return dto;
  },
};
