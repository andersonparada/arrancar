import { and, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { TransferenciaDto } from '../../aplicacion/dto/transferencia.dto.js';
import type { ConsultasTransferencias } from '../../aplicacion/puertos/consultas-transferencias.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
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
  referencia: transferencias.referencia,
  observaciones: transferencias.observaciones,
  anuladaEn: transferencias.anuladaEn,
  motivoDeAnulacion: transferencias.motivoDeAnulacion,
  movimientoOrigenId: movimientoOrigen.id,
  movimientoDestinoId: movimientoDestino.id,
};

/** Une la transferencia con sus dos cuentas (por nombre) y sus dos notas (por id), una vez creadas. */
export class ConsultasTransferenciasDrizzle implements ConsultasTransferencias {
  async obtener(transferenciaId: string): Promise<TransferenciaDto> {
    const [fila] = await transaccionEnCurso()
      .select(columnas)
      .from(transferencias)
      .leftJoin(cuentaOrigen, eq(transferencias.cuentaOrigenId, cuentaOrigen.id))
      .leftJoin(cuentaDestino, eq(transferencias.cuentaDestinoId, cuentaDestino.id))
      .leftJoin(
        movimientoOrigen,
        and(eq(movimientoOrigen.transferenciaId, transferencias.id), eq(movimientoOrigen.tipo, 'debito')),
      )
      .leftJoin(
        movimientoDestino,
        and(eq(movimientoDestino.transferenciaId, transferencias.id), eq(movimientoDestino.tipo, 'credito')),
      )
      .where(eq(transferencias.id, transferenciaId));
    if (!fila) throw new RecursoNoEncontrado('La transferencia');
    return {
      ...fila,
      anuladaEn: fila.anuladaEn ? fila.anuladaEn.toISOString() : null,
      movimientoOrigenId: fila.movimientoOrigenId ?? '',
      movimientoDestinoId: fila.movimientoDestinoId ?? '',
    };
  }
}
