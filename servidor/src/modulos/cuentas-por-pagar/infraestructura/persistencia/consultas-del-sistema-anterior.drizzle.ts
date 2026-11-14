import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { documentos as documentosDeCompra } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { facturasAnteriores } from '../../../libro-de-compras/infraestructura/persistencia/facturas-anteriores.tablas.js';
import type { FacturaAnteriorDeLaNotaDto } from '../../aplicacion/puertos/puertos-de-consultas.js';
import type { NotaLibreDelSistemaAnterior } from '../../dominio/notas-posteriores.js';
import { ajustesDeSaldo } from './ajustes-de-saldo.tablas.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';
import { documentos } from './documentos.tablas.js';

/**
 * Las notas que citan una factura del sistema anterior y siguen sin saldo inicial (no anuladas), con la serie y el
 * número de la factura que citan (Libro de compras, leído sin bloquear) y lo que de ellas sigue libre. Usa el índice
 * parcial `documentos_notas_del_sistema_anterior_libres_idx`.
 */
export async function notasLibresDelSistemaAnterior(): Promise<NotaLibreDelSistemaAnterior[]> {
  const notas = alias(documentos, 'notas_libres');
  const aplicado = sql`coalesce((select sum(${aplicacionesDeNotas.monto}) from ${aplicacionesDeNotas} where ${aplicacionesDeNotas.notaId} = ${notas.id}), 0)`;
  const ajustado = sql`coalesce((select sum(${ajustesDeSaldo.monto}) from ${ajustesDeSaldo} where ${ajustesDeSaldo.documentoId} = ${notas.id} and ${ajustesDeSaldo.estado} = 'vigente'), 0)`;
  const filas = await transaccionEnCurso()
    .select({
      proveedorId: notas.proveedorId,
      tipo: notas.tipo,
      serie: facturasAnteriores.serie,
      numero: facturasAnteriores.numero,
      libre: sql<string>`(case when ${notas.tipo} = 'nota_de_credito' then ${notas.total} - ${aplicado} - ${ajustado} else 0 end)`,
    })
    .from(notas)
    .innerJoin(documentosDeCompra, eq(documentosDeCompra.id, notas.documentoId))
    .innerJoin(facturasAnteriores, eq(facturasAnteriores.id, documentosDeCompra.facturaAnteriorId))
    .where(
      and(eq(notas.facturaDelSistemaAnterior, true), isNull(notas.documentoAfectadoId), ne(notas.estado, 'anulado')),
    );
  return filas.map(({ libre, ...resto }) => ({ ...resto, saldoLibreCentavos: aCentavos(libre) }));
}

/** La factura anterior que cita una nota del libro, para su ficha; `null` si la nota no cita ninguna. */
export async function facturaAnteriorDeLaNota(documentoId: string): Promise<FacturaAnteriorDeLaNotaDto | null> {
  const [fila] = await transaccionEnCurso()
    .select({
      tipo: facturasAnteriores.tipo,
      serie: facturasAnteriores.serie,
      numero: facturasAnteriores.numero,
      fechaEmision: facturasAnteriores.fechaEmision,
    })
    .from(documentosDeCompra)
    .innerJoin(facturasAnteriores, eq(facturasAnteriores.id, documentosDeCompra.facturaAnteriorId))
    .where(eq(documentosDeCompra.id, documentoId));
  return fila ?? null;
}
