import { and, desc, eq, getTableColumns, isNull, lt, lte, or } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { calcularDiferencia, calcularSaldoConciliado } from '../../aplicacion/calculo-de-conciliacion.js';
import type {
  ConciliacionDto,
  ConciliacionResumenDto,
  MovimientoConMarcaDto,
} from '../../aplicacion/dto/conciliacion.dto.js';
import type { ConsultasConciliaciones } from '../../aplicacion/puertos/consultas-conciliaciones.js';
import { aCentavos, deCentavos, efectoEnCentavos } from '../../dominio/centavos.js';
import { finDelMesDe } from '../../dominio/conciliacion.js';
import { conciliaciones } from './conciliaciones.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { movimientos } from './movimientos.tablas.js';

type FilaDeMovimiento = typeof movimientos.$inferSelect;

const columnasDeMovimiento = getTableColumns(movimientos);

/** Los movimientos candidatos de la conciliación: vigentes, de la cuenta, hasta el fin de mes y sin otra conciliación. */
const candidatosDe = (cuentaBancariaId: string, finDelMes: string, conciliacionId: string) =>
  and(
    eq(movimientos.cuentaBancariaId, cuentaBancariaId),
    isNull(movimientos.anuladoEn),
    lte(movimientos.fecha, finDelMes),
    or(isNull(movimientos.conciliacionId), eq(movimientos.conciliacionId, conciliacionId)),
  );

function aMovimientoConMarca(fila: FilaDeMovimiento, conciliacionId: string): MovimientoConMarcaDto {
  const {
    empresaId: _empresaId,
    creadoEn: _creadoEn,
    actualizadoEn: _actualizadoEn,
    creadoPor: _creadoPor,
    actualizadoPor: _actualizadoPor,
    anuladoEn,
    conciliacionId: marcadaEn,
    ...dto
  } = fila;
  return {
    ...dto,
    anuladoEn: anuladoEn ? anuladoEn.toISOString() : null,
    conciliacionId: marcadaEn,
    cuentaBancariaNombre: null,
    chequeId: null,
    numeroDeCheque: null,
    marcado: marcadaEn === conciliacionId,
  };
}

export class ConsultasConciliacionesDrizzle implements ConsultasConciliaciones {
  async listar(cuentaBancariaId: string): Promise<ConciliacionResumenDto[]> {
    const filas = await transaccionEnCurso()
      .select({
        id: conciliaciones.id,
        anio: conciliaciones.anio,
        mes: conciliaciones.mes,
        saldoSegunBanco: conciliaciones.saldoSegunBanco,
        cerradaEn: conciliaciones.cerradaEn,
      })
      .from(conciliaciones)
      .where(eq(conciliaciones.cuentaBancariaId, cuentaBancariaId))
      .orderBy(desc(conciliaciones.anio), desc(conciliaciones.mes));
    return filas.map((fila) => ({
      id: fila.id,
      anio: fila.anio,
      mes: fila.mes,
      saldoSegunBanco: fila.saldoSegunBanco,
      cerrada: fila.cerradaEn !== null,
    }));
  }

  async obtener(conciliacionId: string): Promise<ConciliacionDto> {
    const fila = await this.filaDe(conciliacionId);
    const finDelMes = finDelMesDe({ anio: fila.anio, mes: fila.mes });
    const saldoAnterior = await this.saldoAnteriorDe(fila.cuentaBancariaId, fila.anio, fila.mes);
    const movimientos = await this.candidatosConMarca(fila.cuentaBancariaId, finDelMes, conciliacionId);
    return this.armarDto(fila, saldoAnterior, movimientos);
  }

  private async filaDe(conciliacionId: string) {
    const [fila] = await transaccionEnCurso()
      .select({ ...getTableColumns(conciliaciones), cuentaBancariaNombre: cuentasBancarias.nombre })
      .from(conciliaciones)
      .leftJoin(cuentasBancarias, eq(conciliaciones.cuentaBancariaId, cuentasBancarias.id))
      .where(eq(conciliaciones.id, conciliacionId));
    if (!fila) throw new RecursoNoEncontrado('La conciliación');
    return fila;
  }

  private armarDto(
    fila: Awaited<ReturnType<ConsultasConciliacionesDrizzle['filaDe']>>,
    saldoAnterior: string,
    movimientos: MovimientoConMarcaDto[],
  ): ConciliacionDto {
    const saldoConciliadoEnCentavos = calcularSaldoConciliado(
      aCentavos(saldoAnterior),
      movimientos.map((m) => ({ efectoEnCentavos: efectoEnCentavos(m.tipo, m.monto), marcado: m.marcado })),
    );
    const diferenciaEnCentavos = calcularDiferencia(aCentavos(fila.saldoSegunBanco), saldoConciliadoEnCentavos);
    return {
      id: fila.id,
      cuentaBancariaId: fila.cuentaBancariaId,
      cuentaBancariaNombre: fila.cuentaBancariaNombre,
      anio: fila.anio,
      mes: fila.mes,
      saldoSegunBanco: fila.saldoSegunBanco,
      saldoAnterior,
      movimientos,
      saldoConciliado: deCentavos(saldoConciliadoEnCentavos),
      diferencia: deCentavos(diferenciaEnCentavos),
      cerrada: fila.cerradaEn !== null,
    };
  }

  async idsDeCandidatos(cuentaBancariaId: string, finDelMes: string, conciliacionId: string): Promise<string[]> {
    const filas = await transaccionEnCurso()
      .select({ id: movimientos.id })
      .from(movimientos)
      .where(candidatosDe(cuentaBancariaId, finDelMes, conciliacionId));
    return filas.map((fila) => fila.id);
  }

  /** El saldo según banco de la conciliación inmediata anterior (por año y mes) de la cuenta; `"0.00"` si es la primera. */
  private async saldoAnteriorDe(cuentaBancariaId: string, anio: number, mes: number): Promise<string> {
    const [anterior] = await transaccionEnCurso()
      .select({ saldoSegunBanco: conciliaciones.saldoSegunBanco })
      .from(conciliaciones)
      .where(
        and(
          eq(conciliaciones.cuentaBancariaId, cuentaBancariaId),
          or(lt(conciliaciones.anio, anio), and(eq(conciliaciones.anio, anio), lt(conciliaciones.mes, mes))),
        ),
      )
      .orderBy(desc(conciliaciones.anio), desc(conciliaciones.mes))
      .limit(1);
    return anterior?.saldoSegunBanco ?? '0.00';
  }

  private async candidatosConMarca(
    cuentaBancariaId: string,
    finDelMes: string,
    conciliacionId: string,
  ): Promise<MovimientoConMarcaDto[]> {
    const filas = await transaccionEnCurso()
      .select(columnasDeMovimiento)
      .from(movimientos)
      .where(candidatosDe(cuentaBancariaId, finDelMes, conciliacionId))
      .orderBy(movimientos.fecha);
    return filas.map((fila) => aMovimientoConMarca(fila, conciliacionId));
  }
}
