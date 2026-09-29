import { and, asc, desc, eq, getTableColumns, gte, isNull, lte, ne, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { exigirQueExista } from '../../../core/compartido/infraestructura/exigir-que-exista.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  FiltroDeMovimientos,
  MovimientoDto,
  ResumenDeSinClasificar,
  SolicitudDeMovimiento,
} from '../../aplicacion/dto/movimiento.dto.js';
import type { ConsultasMovimientos } from '../../aplicacion/puertos/consultas-movimientos.js';
import { finDelMesDe } from '../../dominio/conciliacion.js';
import { cheques } from './cheques.tablas.js';
import { esPendienteDeClasificar } from './condiciones-de-clasificacion.js';
import { conceptos } from './conceptos.tablas.js';
import { conciliaciones } from './conciliaciones.tablas.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';
import { cuentaConConciliacionesDe, mesConciliadoDe } from './hechos-de-movimiento.js';
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
  conceptoNombre: conceptos.nombre,
  mesConciliado: mesConciliadoDe(movimientos.cuentaBancariaId, movimientos.fecha),
  cuentaConConciliaciones: cuentaConConciliacionesDe(movimientos.cuentaBancariaId),
};

/** Los movimientos vigentes de una cuenta, sin contar uno (el que se corrige). */
const vigentesDe = (cuentaBancariaId: string, excluir?: string, ...mas: SQL[]) =>
  and(
    eq(movimientos.cuentaBancariaId, cuentaBancariaId),
    isNull(movimientos.anuladoEn),
    excluir ? ne(movimientos.id, excluir) : undefined,
    ...mas,
  );

const condicionDeLaClase = (clase: FiltroDeMovimientos['clase']) => {
  if (clase === 'saldosIniciales') return eq(movimientos.saldoInicial, true);
  if (clase === 'notas')
    return and(
      ne(movimientos.tipo, 'cheque'),
      eq(movimientos.saldoInicial, false),
      isNull(movimientos.transferenciaId),
    );
  return undefined;
};

const condicionesDe = ({ cuentaBancariaId, desde, hasta, clase, conceptoId }: FiltroDeMovimientos) =>
  and(
    conceptoId ? eq(movimientos.conceptoId, conceptoId) : undefined,
    cuentaBancariaId ? eq(movimientos.cuentaBancariaId, cuentaBancariaId) : undefined,
    desde ? gte(movimientos.fecha, desde) : undefined,
    hasta ? lte(movimientos.fecha, hasta) : undefined,
    condicionDeLaClase(clase),
  );

export class ConsultasMovimientosDrizzle implements ConsultasMovimientos {
  async listar(filtro: FiltroDeMovimientos): Promise<MovimientoDto[]> {
    const filas = await this.consulta()
      .where(condicionesDe(filtro))
      .orderBy(desc(movimientos.fecha), desc(movimientos.creadoEn));
    return filas.map(mapeadorDeMovimiento.aDto);
  }

  async listarAscendente(filtro: FiltroDeMovimientos): Promise<MovimientoDto[]> {
    const filas = await this.consulta()
      .where(condicionesDe(filtro))
      .orderBy(asc(movimientos.fecha), asc(movimientos.creadoEn));
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
      .where(and(eq(conciliaciones.cuentaBancariaId, cuentaBancariaId), eq(conciliaciones.estado, 'autorizada')))
      .orderBy(desc(conciliaciones.anio), desc(conciliaciones.mes))
      .limit(1);
    return fila ? finDelMesDe(fila) : null;
  }

  async saldoAlFinDe(cuentaBancariaId: string, fecha: string): Promise<string> {
    const [fila] = await transaccionEnCurso()
      .select({ saldo: sql<string>`(${saldoVigente})::text` })
      .from(movimientos)
      .where(vigentesDe(cuentaBancariaId, undefined, lte(movimientos.fecha, fecha)));
    return fila?.saldo ?? '0.00';
  }

  async vigentesEntre(cuentaBancariaId: string, desde: string, hasta: string): Promise<MovimientoDto[]> {
    const filas = await this.consulta().where(
      vigentesDe(cuentaBancariaId, undefined, gte(movimientos.fecha, desde), lte(movimientos.fecha, hasta)),
    );
    return filas.map(mapeadorDeMovimiento.aDto);
  }

  async resumenDeSinClasificar(filtro: FiltroDeMovimientos): Promise<ResumenDeSinClasificar> {
    const suma = (tipo: string) =>
      sql<string>`(coalesce(sum(${movimientos.monto}) filter (where ${movimientos.tipo} = ${tipo}), 0))::numeric(14,2)::text`;
    const [fila] = await transaccionEnCurso()
      .select({
        cantidad: sql<number>`count(*)::int`,
        entradas: suma('credito'),
        salidas: sql<string>`(coalesce(sum(${movimientos.monto}) filter (where ${movimientos.tipo} <> 'credito'), 0))::numeric(14,2)::text`,
      })
      .from(movimientos)
      .innerJoin(conceptos, eq(conceptos.id, movimientos.conceptoId))
      .where(and(esPendienteDeClasificar, condicionesDe({ ...filtro, conceptoId: undefined, clase: undefined })));
    return {
      cantidad: fila?.cantidad ?? 0,
      montoDeEntradas: fila?.entradas ?? '0.00',
      montoDeSalidas: fila?.salidas ?? '0.00',
    };
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
      .innerJoin(conceptos, eq(conceptos.id, movimientos.conceptoId))
      .leftJoin(chequeDelMovimiento, eq(chequeDelMovimiento.movimientoId, movimientos.id));
  }
}
