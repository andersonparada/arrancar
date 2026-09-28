import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import type { MovimientoDto } from '../../aplicacion/dto/movimiento.dto.js';
import { Movimiento } from '../../dominio/movimiento.js';
import type { movimientos } from './movimientos.tablas.js';

type Fila = typeof movimientos.$inferSelect;

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeMovimiento = {
  aEntidad({ id, empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...campos }: Fila): Movimiento {
    return Movimiento.reconstruir({
      ...campos,
      id: Identificador.desde(id),
      empresaId: Identificador.desde(empresaId),
    });
  },

  aFila(movimiento: Movimiento): typeof movimientos.$inferInsert {
    const { id, empresaId, ...datos } = movimiento.instantanea();
    return { ...datos, id: id.valor, empresaId: empresaId.valor };
  },

  aDto({
    empresaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    anuladoEn,
    ...dto
  }: Fila & Pick<MovimientoDto, 'cuentaBancariaNombre' | 'chequeId' | 'numeroDeCheque'>): MovimientoDto {
    return {
      ...dto,
      anuladoEn: anuladoEn ? anuladoEn.toISOString() : null,
    };
  },
};
