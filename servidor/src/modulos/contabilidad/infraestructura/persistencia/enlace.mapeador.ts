import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { EnlaceDto } from '../../aplicacion/dto/enlace.dto.js';
import type { CuentaId } from '../../dominio/cuenta.js';
import { Enlace } from '../../dominio/enlace.js';
import type { enlaces } from './enlaces.tablas.js';

type Fila = typeof enlaces.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeEnlace = {
  aEntidad({ id, empresaId, cuentaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Enlace {
    return Enlace.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
      cuentaId: Identificador.desde(cuentaId) as CuentaId,
    });
  },

  aFila(enlace: Enlace): typeof enlaces.$inferInsert {
    const { id, empresaId, cuentaId, ...datos } = enlace.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor, cuentaId: cuentaId.valor };
  },

  aDto({
    empresaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    ...dto
  }: Fila & Pick<EnlaceDto, 'cuentaCodigo' | 'cuentaNombre'>): EnlaceDto {
    return dto;
  },
};
