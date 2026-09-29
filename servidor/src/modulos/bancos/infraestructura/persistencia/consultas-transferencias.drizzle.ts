import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { FiltroDeTransferencias, TransferenciaDto } from '../../aplicacion/dto/transferencia.dto.js';
import type { ConsultasTransferencias } from '../../aplicacion/puertos/consultas-transferencias.js';
import { accionesDeTransferencia } from '../../aplicacion/acciones-posibles.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { columnasDeHechos, hechosDeLaFila } from './hechos-de-movimiento.js';
import { movimientos } from './movimientos.tablas.js';
import { transferencias } from './transferencias.tablas.js';

const cuentaOrigen = alias(cuentasBancarias, 'cuenta_origen');
const cuentaDestino = alias(cuentasBancarias, 'cuenta_destino');
const movimientoOrigen = alias(movimientos, 'movimiento_origen');
const movimientoDestino = alias(movimientos, 'movimiento_destino');

const columnas = {
  id: transferencias.id,
  cuentaOrigenId: transferencias.cuentaOrigenId,
  cuentaOrigenNombre: cuentaOrigen.nombre,
  cuentaDestinoId: transferencias.cuentaDestinoId,
  cuentaDestinoNombre: cuentaDestino.nombre,
  fecha: transferencias.fecha,
  monto: transferencias.monto,
  numero: transferencias.numero,
  anioDeNumero: transferencias.anioDeNumero,
  referencia: transferencias.referencia,
  observaciones: transferencias.observaciones,
  anuladaEn: transferencias.anuladaEn,
  motivoDeAnulacion: transferencias.motivoDeAnulacion,
  movimientoOrigenId: movimientoOrigen.id,
  movimientoDestinoId: movimientoDestino.id,
  conciliacionOrigenId: movimientoOrigen.conciliacionId,
  conciliacionDestinoId: movimientoDestino.conciliacionId,
  hechosDelOrigen: columnasDeHechos(movimientoOrigen),
  hechosDelDestino: columnasDeHechos(movimientoDestino),
};

const condicionesDe = ({ cuentaBancariaId, desde, hasta }: FiltroDeTransferencias) =>
  and(
    cuentaBancariaId
      ? or(eq(transferencias.cuentaOrigenId, cuentaBancariaId), eq(transferencias.cuentaDestinoId, cuentaBancariaId))
      : undefined,
    desde ? gte(transferencias.fecha, desde) : undefined,
    hasta ? lte(transferencias.fecha, hasta) : undefined,
  );

const consultaBase = () =>
  transaccionEnCurso()
    .select(columnas)
    .from(transferencias)
    .leftJoin(cuentaOrigen, eq(transferencias.cuentaOrigenId, cuentaOrigen.id))
    .leftJoin(cuentaDestino, eq(transferencias.cuentaDestinoId, cuentaDestino.id))
    .leftJoin(
      movimientoOrigen,
      and(
        eq(movimientoOrigen.transferenciaId, transferencias.id),
        eq(movimientoOrigen.tipo, 'debito'),
        isNull(movimientoOrigen.revierteAId),
      ),
    )
    .leftJoin(
      movimientoDestino,
      and(
        eq(movimientoDestino.transferenciaId, transferencias.id),
        eq(movimientoDestino.tipo, 'credito'),
        isNull(movimientoDestino.revierteAId),
      ),
    );

type FilaDeTransferencia = Awaited<ReturnType<typeof consultaBase>>[number];

function aDto(fila: FilaDeTransferencia): TransferenciaDto {
  const { hechosDelOrigen, hechosDelDestino, ...datos } = fila;
  const acciones = accionesDeTransferencia(fila.anuladaEn !== null, {
    origen: hechosDeLaFila(hechosDelOrigen),
    destino: hechosDeLaFila(hechosDelDestino),
  });
  return {
    ...(datos as unknown as TransferenciaDto),
    anuladaEn: fila.anuladaEn ? fila.anuladaEn.toISOString() : null,
    movimientoOrigenId: fila.movimientoOrigenId ?? '',
    movimientoDestinoId: fila.movimientoDestinoId ?? '',
    ...acciones,
  };
}

/** Une la transferencia con sus dos cuentas (por nombre) y sus dos notas (por id), una vez creadas. */
export class ConsultasTransferenciasDrizzle implements ConsultasTransferencias {
  async obtener(transferenciaId: string): Promise<TransferenciaDto> {
    const [fila] = await consultaBase().where(eq(transferencias.id, transferenciaId));
    if (!fila) throw new RecursoNoEncontrado('La transferencia');
    return aDto(fila);
  }

  async listar(filtro: FiltroDeTransferencias): Promise<TransferenciaDto[]> {
    const filas = await consultaBase().where(condicionesDe(filtro)).orderBy(desc(transferencias.fecha));
    return filas.map(aDto);
  }
}
