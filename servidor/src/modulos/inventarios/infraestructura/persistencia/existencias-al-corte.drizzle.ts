import { sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ArticuloAlCorte, CantidadEnBodega } from '../../dominio/cierre/existencias-del-cierre.js';
import { aDiezmilesimas, aCentavosEnteros } from '../../dominio/decimales.js';
import type { TipoDeInventario } from '../../dominio/tipos-de-inventario.js';

type FilaDeSaldo = {
  articulo_id: string;
  tipo_de_inventario: TipoDeInventario;
  saldo_cantidad: string;
  saldo_valor: string;
};

type FilaDeBodega = {
  articulo_id: string;
  bodega_id: string;
  cantidad: string;
};

/** Lo último que dice el kardex de cada artículo con existencia al final del día `fin`: su cantidad y su valor. */
async function saldosAl(fin: string): Promise<FilaDeSaldo[]> {
  const { rows } = await transaccionEnCurso().execute<FilaDeSaldo>(sql`
    select ultimo.articulo_id, a.tipo_de_inventario, ultimo.saldo_cantidad, ultimo.saldo_valor
    from (
      select distinct on (m.articulo_id) m.articulo_id, m.saldo_cantidad, m.saldo_valor
      from inventarios.movimientos m
      where m.vigente and m.fecha <= ${fin}::date
      order by m.articulo_id, m.fecha desc, m.orden_del_dia desc, m.secuencia desc
    ) ultimo
    join inventarios.articulos a on a.id = ultimo.articulo_id
    where ultimo.saldo_cantidad > 0
    order by ultimo.articulo_id`);
  return rows;
}

/** Lo que había en cada bodega: la suma de los movimientos vigentes (con signo) hasta el día `fin`. */
async function cantidadesPorBodegaAl(fin: string): Promise<FilaDeBodega[]> {
  const { rows } = await transaccionEnCurso().execute<FilaDeBodega>(sql`
    select m.articulo_id, m.bodega_id, sum(m.cantidad) as cantidad
    from inventarios.movimientos m
    where m.vigente and m.fecha <= ${fin}::date and m.bodega_id is not null
    group by m.articulo_id, m.bodega_id
    having sum(m.cantidad) <> 0`);
  return rows;
}

/**
 * Lo que salió de una bodega en un traslado vigente y, al final del día `fin`, todavía no tenía su recepción vigente:
 * viaja entre bodegas. Se cuenta en la bodega de origen.
 */
async function enTransitoAl(fin: string): Promise<FilaDeBodega[]> {
  const { rows } = await transaccionEnCurso().execute<FilaDeBodega>(sql`
    select m.articulo_id, d.bodega_id, -sum(m.cantidad) as cantidad
    from inventarios.movimientos m
    join inventarios.documentos d on d.id = m.documento_id
    where m.vigente and d.clase = 'salida_de_traslado' and d.estado = 'vigente' and d.fecha <= ${fin}::date
      and not exists (
        select 1 from inventarios.documentos r
        where r.documento_relacionado_id = d.id and r.clase = 'entrada_de_traslado'
          and r.estado = 'vigente' and r.fecha <= ${fin}::date)
    group by m.articulo_id, d.bodega_id
    having sum(m.cantidad) <> 0`);
  return rows;
}

function agrupar(filas: readonly FilaDeBodega[]): Map<string, CantidadEnBodega[]> {
  const porArticulo = new Map<string, CantidadEnBodega[]>();
  for (const { articulo_id: articuloId, bodega_id: bodegaId, cantidad } of filas) {
    const lista = porArticulo.get(articuloId) ?? [];
    lista.push({ bodegaId, cantidad: aDiezmilesimas(cantidad) });
    porArticulo.set(articuloId, lista);
  }
  return porArticulo;
}

/**
 * Lo que había de cada artículo con existencia al final del día `fin`, de toda la empresa (sin el alcance por bodega: los
 * movimientos no lo llevan y los documentos de traslado se leen aquí solo para contar). La cantidad y el valor del artículo
 * salen del saldo de su último movimiento; las bodegas, de la suma de sus movimientos.
 */
export async function existenciasAlCorte(fin: string): Promise<ArticuloAlCorte[]> {
  const saldos = await saldosAl(fin);
  const bodegas = agrupar(await cantidadesPorBodegaAl(fin));
  const viajando = agrupar(await enTransitoAl(fin));
  return saldos.map((saldo) => ({
    articuloId: saldo.articulo_id,
    tipoDeInventario: saldo.tipo_de_inventario,
    cantidad: aDiezmilesimas(saldo.saldo_cantidad),
    valor: aCentavosEnteros(saldo.saldo_valor),
    porBodega: bodegas.get(saldo.articulo_id) ?? [],
    enTransito: viajando.get(saldo.articulo_id) ?? [],
  }));
}
