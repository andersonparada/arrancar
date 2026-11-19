import { and, asc, count, eq, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ConsultasDeSaldosIniciales,
  CuentaConSuCabecera,
  PartidaDeLaBase,
  SaldoPrincipal,
} from '../../aplicacion/puertos/consultas-de-saldos-iniciales.js';
import { bancos } from './bancos.tablas.js';
import { cheques } from './cheques.tablas.js';
import { chequeras } from './chequeras.tablas.js';
import { conceptos } from './conceptos.tablas.js';
import { conciliaciones } from './conciliaciones.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { cuentaConConciliacionesDe } from './hechos-de-movimiento.js';
import { movimientos } from './movimientos.tablas.js';
import { archivoDeLaEvidenciaDe, evidenciaDeLaCuenta } from './evidencia-de-apertura.consulta.drizzle.js';
import { saldosIniciales } from './saldos-iniciales.tablas.js';

/** Lo que se lee de cada partida de apertura, con su cheque, su concepto y la conciliación donde está marcada. */
const columnasDeLaPartida = {
  movimientoId: movimientos.id,
  cuentaBancariaId: movimientos.cuentaBancariaId,
  parte: movimientos.parteDeApertura,
  tipo: movimientos.tipo,
  fecha: movimientos.fecha,
  monto: movimientos.monto,
  serie: chequeras.serie,
  numeroDeCheque: cheques.numero,
  beneficiario: movimientos.beneficiario,
  referencia: movimientos.referencia,
  observaciones: movimientos.observaciones,
  conceptoId: movimientos.conceptoId,
  conceptoNombre: conceptos.nombre,
  conciliacionId: movimientos.conciliacionId,
  anio: conciliaciones.anio,
  mes: conciliaciones.mes,
  anuladoEn: movimientos.anuladoEn,
  revertidoEn: movimientos.revertidoEn,
};

/** Lecturas de los saldos iniciales; la seguridad por empresa (RLS) limita lo que se ve. */
export class ConsultasDeSaldosInicialesDrizzle implements ConsultasDeSaldosIniciales {
  async cuentas(): Promise<CuentaConSuCabecera[]> {
    return transaccionEnCurso()
      .select({
        cuentaBancariaId: cuentasBancarias.id,
        cuentaNombre: cuentasBancarias.nombre,
        bancoNombre: bancos.nombre,
        activa: cuentasBancarias.activo,
        cabeceraId: saldosIniciales.id,
        saldoSegunLibrosAnteriores: saldosIniciales.saldoSegunLibrosAnteriores,
        observaciones: saldosIniciales.observaciones,
        tieneEvidencia: sql<boolean>`${saldosIniciales.evidenciaArchivoId} is not null`,
        tieneConciliaciones: cuentaConConciliacionesDe(cuentasBancarias.id),
      })
      .from(cuentasBancarias)
      .innerJoin(bancos, eq(bancos.id, cuentasBancarias.bancoId))
      .leftJoin(saldosIniciales, eq(saldosIniciales.cuentaBancariaId, cuentasBancarias.id))
      .orderBy(asc(cuentasBancarias.nombre));
  }

  async partidas(cuentaBancariaId?: string): Promise<PartidaDeLaBase[]> {
    const filas = await transaccionEnCurso()
      .select(columnasDeLaPartida)
      .from(movimientos)
      .innerJoin(conceptos, eq(conceptos.id, movimientos.conceptoId))
      .leftJoin(cheques, eq(cheques.movimientoId, movimientos.id))
      .leftJoin(chequeras, eq(chequeras.id, cheques.chequeraId))
      .leftJoin(conciliaciones, eq(conciliaciones.id, movimientos.conciliacionId))
      .where(
        and(
          isNotNull(movimientos.parteDeApertura),
          cuentaBancariaId ? eq(movimientos.cuentaBancariaId, cuentaBancariaId) : undefined,
        ),
      )
      .orderBy(asc(movimientos.fecha), asc(movimientos.creadoEn));
    return filas.map(({ anio, mes, anuladoEn, revertidoEn, parte, ...fila }) => ({
      ...fila,
      parte: parte!,
      conciliadaEn: anio !== null && mes !== null ? { anio, mes } : null,
      anulada: anuladoEn !== null,
      revertida: revertidoEn !== null,
    }));
  }

  async contarMovimientosNormalesHasta(cuentaBancariaId: string, corte: string): Promise<number> {
    const [fila] = await transaccionEnCurso()
      .select({ cantidad: count() })
      .from(movimientos)
      .where(
        and(
          eq(movimientos.cuentaBancariaId, cuentaBancariaId),
          isNull(movimientos.parteDeApertura),
          isNull(movimientos.anuladoEn),
          lte(movimientos.fecha, corte),
        ),
      );
    return fila?.cantidad ?? 0;
  }

  async saldosPrincipales(): Promise<SaldoPrincipal[]> {
    const filas = await transaccionEnCurso()
      .select({
        cuentaBancariaId: movimientos.cuentaBancariaId,
        parte: movimientos.parteDeApertura,
        fecha: movimientos.fecha,
      })
      .from(movimientos)
      .where(
        and(inArray(movimientos.parteDeApertura, ['saldo_del_banco', 'saldo_global']), isNull(movimientos.anuladoEn)),
      );
    return filas.map((fila) => ({ ...fila, parte: fila.parte as SaldoPrincipal['parte'] }));
  }

  archivoDeLaEvidencia(cuentaBancariaId: string) {
    return archivoDeLaEvidenciaDe(cuentaBancariaId);
  }

  evidenciaDe(cuentaBancariaId: string) {
    return evidenciaDeLaCuenta(cuentaBancariaId);
  }
}
