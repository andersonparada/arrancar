import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { accionesDeMovimiento } from '../../aplicacion/acciones-posibles.js';
import type { MovimientoDto } from '../../aplicacion/dto/movimiento.dto.js';
import { Movimiento } from '../../dominio/movimiento.js';
import { hechosDeLaFila } from './hechos-de-movimiento.js';
import type { movimientos } from './movimientos.tablas.js';

type Fila = typeof movimientos.$inferSelect;

/** Lo que trae la consulta además de la fila: para saber qué se puede hacer con el movimiento. */
interface DatosDeLaConsulta extends Pick<
  MovimientoDto,
  'cuentaBancariaNombre' | 'chequeId' | 'numeroDeCheque' | 'conceptoNombre'
> {
  mesConciliado: boolean;
  cuentaConConciliaciones: boolean;
}

/** Traduce entre la fila de la tabla, la entidad y lo que ve la pantalla. */
export const mapeadorDeMovimiento = {
  aEntidad({
    id,
    empresaId,
    creadoEn,
    actualizadoEn,
    creadoPor,
    actualizadoPor,
    conciliacionId: _conciliacionId,
    ...campos
  }: Fila): Movimiento {
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

  aDto(fila: Fila & DatosDeLaConsulta): MovimientoDto {
    const {
      empresaId: _empresaId,
      creadoEn: _creadoEn,
      actualizadoEn: _actualizadoEn,
      creadoPor: _creadoPor,
      actualizadoPor: _actualizadoPor,
      mesConciliado: _mesConciliado,
      cuentaConConciliaciones: _cuentaConConciliaciones,
      anuladoEn,
      revertidoEn,
      ...dto
    } = fila;
    return {
      ...dto,
      anuladoEn: anuladoEn ? anuladoEn.toISOString() : null,
      revertidoEn: revertidoEn ? revertidoEn.toISOString() : null,
      ...accionesDeMovimiento(hechosDeLaFila(fila)),
    };
  },
};
