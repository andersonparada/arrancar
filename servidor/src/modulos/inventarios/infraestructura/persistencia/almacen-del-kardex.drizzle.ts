import { and, asc, eq, sql } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { CambioDeMovimiento, SaldoDelArticulo } from '../../dominio/costeo/cambios-del-recorrido.js';
import type { MovimientoDelKardex } from '../../dominio/costeo/movimientos-del-kardex.js';
import { deCentavosEnteros, deDiezmilesimas, deMillonesimas } from '../../dominio/decimales.js';
import type {
  AlmacenDelKardex,
  DerivadoDePeps,
  NuevoMovimiento,
  NuevoRecalculo,
} from '../../aplicacion/puertos/almacen-del-kardex.js';
import { enTandas } from './en-tandas.js';
import { reemplazarCapasDelArticulo } from './capas-del-kardex.js';
import { aMovimientoDelKardex, columnasConReparto } from './movimiento-del-kardex.mapeador.js';
import { agregarRepartosDe, sincronizarRepartosDe } from './repartos-del-kardex.js';
import { movimientos } from './movimientos.tablas.js';
import { recalculos } from './recalculos.tablas.js';
import { saldosDeArticulos } from './saldos-de-articulos.tablas.js';

const filaNueva = (m: NuevoMovimiento) => ({
  empresaId: deLaTransaccion.empresa(),
  documentoId: m.documentoId,
  articuloId: m.articuloId,
  bodegaId: m.bodegaId,
  loteId: m.loteId,
  fecha: m.fecha,
  ordenDelDia: m.ordenDelDia,
  tipo: m.tipo,
  cantidad: deDiezmilesimas(m.cantidad),
  cantidadEscrita: m.cantidadEscrita === null ? null : deDiezmilesimas(m.cantidadEscrita),
  unidadEscritaId: m.unidadEscritaId,
  costoUnitario: deMillonesimas(m.costoUnitario),
  costoTotal: deCentavosEnteros(m.costoTotal),
  costoDelMetodo: m.costoDelMetodo,
  lineaDeDocumentoDeCompraId: m.lineaDeCompraId ?? null,
  documentoDeCompraId: m.documentoDeCompraId ?? null,
  movimientoDeOrigenId: m.movimientoDeOrigenId ?? null,
  fechaDeCapa: m.fechaDeCapa ?? null,
  saldoCantidad: '0',
  saldoValor: '0',
});

/**
 * El kardex del artículo en PostgreSQL. Las tablas tienen seguridad por empresa (RLS): ninguna consulta filtra por
 * empresa. Los movimientos no llevan alcance por bodega a propósito (el recálculo toca todas las bodegas).
 */
export class AlmacenDelKardexDrizzle implements AlmacenDelKardex {
  /** Candado compartido del cierre y luego uno por artículo, ordenados por id (R-5). */
  async bloquear(articuloIds: readonly string[]): Promise<void> {
    const transaccion = transaccionEnCurso();
    await transaccion.execute(
      sql`select pg_advisory_xact_lock_shared(hashtextextended('inventarios.cierre:' || current_setting('app.empresa_id', true), 0))`,
    );
    for (const id of [...new Set(articuloIds)].sort()) {
      await transaccion.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`inventarios.articulo:${id}`}, 0))`,
      );
    }
  }

  async movimientosVigentes(articuloId: string): Promise<MovimientoDelKardex[]> {
    const filas = await transaccionEnCurso()
      .select(columnasConReparto())
      .from(movimientos)
      .where(and(eq(movimientos.articuloId, articuloId), eq(movimientos.vigente, true)))
      .orderBy(asc(movimientos.fecha), asc(movimientos.ordenDelDia), asc(movimientos.secuencia));
    return filas.map(aMovimientoDelKardex);
  }

  async movimientosDelDocumento(documentoId: string): Promise<MovimientoDelKardex[]> {
    const filas = await transaccionEnCurso()
      .select(columnasConReparto())
      .from(movimientos)
      .where(eq(movimientos.documentoId, documentoId))
      .orderBy(asc(movimientos.secuencia));
    return filas.map(aMovimientoDelKardex);
  }

  async agregarMovimientos(nuevos: readonly NuevoMovimiento[]): Promise<MovimientoDelKardex[]> {
    const agregados: MovimientoDelKardex[] = [];
    for (const tanda of enTandas(nuevos)) {
      const filas = await transaccionEnCurso().insert(movimientos).values(tanda.map(filaNueva)).returning();
      agregados.push(...filas.map((fila) => aMovimientoDelKardex(fila)));
    }
    await agregarRepartosDe(nuevos, agregados);
    return agregados.map((m, indice) => ({ ...m, parteDeReparto: nuevos[indice]!.reparto?.parte ?? null }));
  }

  /** Una sola sentencia por tanda: solo se escriben las filas que cambiaron. */
  async actualizarMovimientos(cambios: readonly CambioDeMovimiento[]): Promise<void> {
    for (const tanda of enTandas(cambios)) {
      const valores = tanda.map(
        (c) =>
          sql`(${c.id}::uuid, ${deCentavosEnteros(c.costoTotal)}::numeric, ${deMillonesimas(c.costoUnitario)}::numeric, ${deDiezmilesimas(c.saldoCantidad)}::numeric, ${deCentavosEnteros(c.saldoValor)}::numeric, ${deCentavosEnteros(c.montoAResultados)}::numeric)`,
      );
      await transaccionEnCurso().execute(sql`
        update inventarios.movimientos as m set
          costo_total = v.costo_total, costo_unitario = v.costo_unitario, saldo_cantidad = v.saldo_cantidad,
          saldo_valor = v.saldo_valor, monto_a_resultados = v.monto_a_resultados, actualizado_en = now(),
          actualizado_por = nullif(current_setting('app.usuario_id', true), '')::uuid
        from (values ${sql.join(valores, sql`, `)})
          as v(id, costo_total, costo_unitario, saldo_cantidad, saldo_valor, monto_a_resultados)
        where m.id = v.id`);
    }
    await sincronizarRepartosDe(cambios.map((c) => c.id));
  }

  async desactivarMovimientosDelDocumento(documentoId: string): Promise<void> {
    await transaccionEnCurso()
      .update(movimientos)
      .set({ vigente: false })
      .where(eq(movimientos.documentoId, documentoId));
  }

  async desactivarMovimiento(movimientoId: string): Promise<void> {
    await transaccionEnCurso().update(movimientos).set({ vigente: false }).where(eq(movimientos.id, movimientoId));
  }

  /** Las capas y sus consumos son derivados: se regeneran desde el kardex (§5.13), sin auditar fila por fila. */
  reemplazarCapas(articuloId: string, derivado: DerivadoDePeps): Promise<void> {
    return reemplazarCapasDelArticulo(articuloId, derivado);
  }

  async guardarSaldo(articuloId: string, saldo: SaldoDelArticulo): Promise<void> {
    const valores = {
      cantidad: deDiezmilesimas(saldo.cantidad),
      valor: deCentavosEnteros(saldo.valor),
      costoPromedio: deMillonesimas(saldo.costoPromedio),
      ultimoMovimientoId: saldo.ultimoMovimientoId,
    };
    await transaccionEnCurso()
      .insert(saldosDeArticulos)
      .values({ empresaId: deLaTransaccion.empresa(), articuloId, ...valores })
      .onConflictDoUpdate({ target: [saldosDeArticulos.empresaId, saldosDeArticulos.articuloId], set: valores });
  }

  async agregarRecalculo(recalculo: NuevoRecalculo): Promise<void> {
    await transaccionEnCurso()
      .insert(recalculos)
      .values({
        empresaId: deLaTransaccion.empresa(),
        articuloId: recalculo.articuloId,
        desdeFecha: recalculo.desdeFecha,
        documentoCausaId: recalculo.documentoCausaId,
        causa: recalculo.causa,
        salidasAfectadas: recalculo.salidasAfectadas,
        diferenciaDeCosto: deCentavosEnteros(recalculo.diferenciaDeCosto),
        repartosAfectados: recalculo.repartosAfectados ?? 0,
        diferenciaAResultados: deCentavosEnteros(recalculo.diferenciaAResultados ?? 0n),
      });
  }
}
