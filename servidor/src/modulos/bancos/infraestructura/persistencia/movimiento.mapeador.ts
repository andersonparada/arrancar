import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { accionesDeMovimiento, estaMarcada } from '../../aplicacion/acciones-posibles.js';
import type { LineaDeDesgloseDto, MovimientoDto } from '../../aplicacion/dto/movimiento.dto.js';
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
  conceptoEsDePago: boolean;
  desglose: LineaDeDesgloseDto[];
}

/** Hasta BS-2 la parte de apertura y su cabecera son cosa de la base: ni la entidad ni la API las ven. */
function sinDatosDeApertura<T extends { parteDeApertura: unknown; saldoInicialId: unknown }>({
  parteDeApertura: _parteDeApertura,
  saldoInicialId: _saldoInicialId,
  ...resto
}: T) {
  return resto;
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
    beneficiarioParaComparar: _beneficiarioParaComparar,
    parteDeApertura: _parteDeApertura,
    saldoInicialId: _saldoInicialId,
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
      beneficiarioParaComparar: _beneficiarioParaComparar,
      mesConciliado: _mesConciliado,
      cuentaConConciliaciones: _cuentaConConciliaciones,
      conceptoEsDePago: _conceptoEsDePago,
      anuladoEn,
      revertidoEn,
      ...dto
    } = sinDatosDeApertura(fila);
    const hechos = hechosDeLaFila(fila);
    return {
      ...dto,
      anuladoEn: anuladoEn ? anuladoEn.toISOString() : null,
      revertidoEn: revertidoEn ? revertidoEn.toISOString() : null,
      marcadaParaCuentasPorPagar: estaMarcada(hechos),
      ...accionesDeMovimiento(hechos),
    };
  },
};
