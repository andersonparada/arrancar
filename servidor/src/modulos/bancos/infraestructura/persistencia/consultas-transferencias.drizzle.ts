import { and, desc, eq, gte, lte, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { FiltroDeTransferencias, TransferenciaDto } from '../../aplicacion/dto/transferencia.dto.js';
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

const condicionesDe = ({ cuentaBancariaId, desde, hasta }: FiltroDeTransferencias) =>
  and(
    cuentaBancariaId
      ? or(eq(transferencias.cuentaOrigenId, cuentaBancariaId), eq(transferencias.cuentaDestinoId, cuentaBancariaId))
      : undefined,
    desde ? gte(transferencias.fecha, desde) : undefined,
    hasta ? lte(transferencias.fecha, hasta) : undefined,
  );

/** Une la transferencia con sus dos cuentas (por nombre) y sus dos notas (por id), una vez creadas. */
export class ConsultasTransferenciasDrizzle implements ConsultasTransferencias {
  async obtener(transferenciaId: string): Promise<TransferenciaDto> {
    const [fila] = await this.consulta().where(eq(transferencias.id, transferenciaId));
    if (!fila) throw new RecursoNoEncontrado('La transferencia');
    return this.aDto(fila);
  }

  async listar(filtro: FiltroDeTransferencias): Promise<TransferenciaDto[]> {
    const filas = await this.consulta().where(condicionesDe(filtro)).orderBy(desc(transferencias.fecha));
    return filas.map((fila) => this.aDto(fila));
  }

  private consulta() {
    return transaccionEnCurso()
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
      );
  }

  private aDto(fila: {
    anuladaEn: Date | null;
    movimientoOrigenId: string | null;
    movimientoDestinoId: string | null;
  }): TransferenciaDto {
    return {
      ...(fila as unknown as TransferenciaDto),
      anuladaEn: fila.anuladaEn ? fila.anuladaEn.toISOString() : null,
      movimientoOrigenId: fila.movimientoOrigenId ?? '',
      movimientoDestinoId: fila.movimientoDestinoId ?? '',
    };
  }
}
