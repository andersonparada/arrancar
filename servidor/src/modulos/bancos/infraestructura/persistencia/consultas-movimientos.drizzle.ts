import { and, asc, desc, eq, getTableColumns, gte, isNotNull, isNull, lte, ne, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { FiltroDeMovimientos, MovimientoDto, SolicitudDeMovimiento } from '../../aplicacion/dto/movimiento.dto.js';
import type { ConsultasMovimientos } from '../../aplicacion/puertos/consultas-movimientos.js';
import { finDelMesDe } from '../../dominio/conciliacion.js';
import { cheques } from './cheques.tablas.js';
import { conciliaciones } from './conciliaciones.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { mapeadorDeMovimiento } from './movimiento.mapeador.js';
import { movimientos } from './movimientos.tablas.js';
import { saldoVigente } from './saldo-vigente.js';

const cuentaBancaria = alias(cuentasBancarias, 'cuenta_bancaria');
const chequeDelMovimiento = alias(cheques, 'cheque_del_movimiento');

const columnas = {
  ...getTableColumns(movimientos),
  cuentaBancariaNombre: cuentaBancaria.nombre,
  chequeId: chequeDelMovimiento.id,
  numeroDeCheque: chequeDelMovimiento.numero,
};

/** Los movimientos vigentes de una cuenta, sin contar uno (el que se corrige). */
const vigentesDe = (cuentaBancariaId: string, excluir?: string, ...mas: SQL[]) =>
  and(
    eq(movimientos.cuentaBancariaId, cuentaBancariaId),
    isNull(movimientos.anuladoEn),
    excluir ? ne(movimientos.id, excluir) : undefined,
    ...mas,
  );

const condicionesDe = ({ cuentaBancariaId, desde, hasta }: FiltroDeMovimientos) =>
  and(
    cuentaBancariaId ? eq(movimientos.cuentaBancariaId, cuentaBancariaId) : undefined,
    desde ? gte(movimientos.fecha, desde) : undefined,
    hasta ? lte(movimientos.fecha, hasta) : undefined,
  );

export class ConsultasMovimientosDrizzle implements ConsultasMovimientos {
  async listar(filtro: FiltroDeMovimientos): Promise<MovimientoDto[]> {
    const filas = await this.consulta()
      .where(condicionesDe(filtro))
      .orderBy(desc(movimientos.fecha), desc(movimientos.creadoEn));
    return filas.map(mapeadorDeMovimiento.aDto);
  }

  async obtener(movimientoId: string): Promise<MovimientoDto> {
    const [fila] = await this.consulta().where(eq(movimientos.id, movimientoId));
    if (!fila) throw new RecursoNoEncontrado('El movimiento');
    return mapeadorDeMovimiento.aDto(fila);
  }

  /** Lo elegido debe existir y ser de la empresa: la seguridad por filas oculta lo ajeno. */
  async exigirReferencias(solicitud: SolicitudDeMovimiento): Promise<void> {
    await exigirQueExista(cuentasBancarias, solicitud.cuentaBancariaId, 'La cuenta bancaria');
  }

  async cuentaEstaActiva(cuentaBancariaId: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ activo: cuentasBancarias.activo })
      .from(cuentasBancarias)
      .where(eq(cuentasBancarias.id, cuentaBancariaId));
    if (!fila) throw new RecursoNoEncontrado('La cuenta bancaria');
    return fila.activo;
  }

  async saldoDe(cuentaBancariaId: string): Promise<string> {
    const [fila] = await transaccionEnCurso()
      .select({ saldo: sql<string>`(${saldoVigente})::text` })
      .from(movimientos)
      .where(vigentesDe(cuentaBancariaId));
    return fila?.saldo ?? '0.00';
  }

  fechaDelSaldoInicial(cuentaBancariaId: string, excluir?: string): Promise<string | null> {
    return this.primeraFecha(vigentesDe(cuentaBancariaId, excluir, eq(movimientos.saldoInicial, true)));
  }

  fechaMasAntigua(cuentaBancariaId: string, excluir?: string): Promise<string | null> {
    return this.primeraFecha(vigentesDe(cuentaBancariaId, excluir));
  }

  async conciliadaHasta(cuentaBancariaId: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ anio: conciliaciones.anio, mes: conciliaciones.mes })
      .from(conciliaciones)
      .where(and(eq(conciliaciones.cuentaBancariaId, cuentaBancariaId), isNotNull(conciliaciones.cerradaEn)))
      .orderBy(desc(conciliaciones.anio), desc(conciliaciones.mes))
      .limit(1);
    return fila ? finDelMesDe(fila) : null;
  }

  private async primeraFecha(condicion: SQL | undefined): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ fecha: movimientos.fecha })
      .from(movimientos)
      .where(condicion)
      .orderBy(asc(movimientos.fecha))
      .limit(1);
    return fila?.fecha ?? null;
  }

  private consulta() {
    return transaccionEnCurso()
      .select(columnas)
      .from(movimientos)
      .leftJoin(cuentaBancaria, eq(movimientos.cuentaBancariaId, cuentaBancaria.id))
      .leftJoin(chequeDelMovimiento, eq(chequeDelMovimiento.movimientoId, movimientos.id));
  }
}
