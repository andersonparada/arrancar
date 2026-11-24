import { comoPropietario } from './consultas-de-propietario.js';

const SIN_LOTE = '00000000-0000-0000-0000-000000000000';

/** Las existencias de la caché contra la suma de los movimientos vigentes (§13, «Cuadre del kardex»). */
async function existenciasDesviadas(empresaId: string): Promise<string[]> {
  const filas = await comoPropietario<{ articulo_id: string; cache: string; kardex: string }>(
    `select coalesce(e.articulo_id, m.articulo_id) as articulo_id,
            coalesce(e.cantidad, 0)::text as cache, coalesce(m.suma, 0)::text as kardex
       from (select * from inventarios.existencias where empresa_id = $1) e
       full join (select bodega_id, articulo_id, coalesce(lote_id, '${SIN_LOTE}') as lote_clave, sum(cantidad) as suma
                    from inventarios.movimientos where empresa_id = $1 and vigente and bodega_id is not null
                   group by 1, 2, 3) m
         on m.bodega_id = e.bodega_id and m.articulo_id = e.articulo_id and m.lote_clave = e.lote_clave
      where coalesce(e.cantidad, 0) <> coalesce(m.suma, 0)`,
    [empresaId],
  );
  return filas.map((f) => `existencias del artículo ${f.articulo_id}: caché ${f.cache}, kardex ${f.kardex}`);
}

/** El saldo del artículo contra el saldo de su último movimiento vigente, en el orden del kardex. */
async function saldosDesviados(empresaId: string): Promise<string[]> {
  const filas = await comoPropietario<{ articulo_id: string; cache: string; kardex: string }>(
    `with ultimo as (
       select distinct on (articulo_id) articulo_id, saldo_cantidad, saldo_valor, id
         from inventarios.movimientos where empresa_id = $1 and vigente
        order by articulo_id, fecha desc, orden_del_dia desc, secuencia desc)
     select coalesce(s.articulo_id, u.articulo_id) as articulo_id,
            coalesce(s.cantidad::text || '/' || s.valor::text, 'sin saldo') as cache,
            coalesce(u.saldo_cantidad::text || '/' || u.saldo_valor::text, '0.0000/0.00') as kardex
       from (select * from inventarios.saldos_de_articulos where empresa_id = $1) s
       full join ultimo u on u.articulo_id = s.articulo_id
      where (s.cantidad, s.valor) is distinct from (coalesce(u.saldo_cantidad, 0), coalesce(u.saldo_valor, 0))`,
    [empresaId],
  );
  return filas.map((f) => `saldo del artículo ${f.articulo_id}: caché ${f.cache}, kardex ${f.kardex}`);
}

/** Con PEPS, lo que queda en las capas contra el saldo del artículo. */
async function capasDesviadas(empresaId: string): Promise<string[]> {
  const filas = await comoPropietario<{ articulo_id: string }>(
    `select c.articulo_id
       from (select articulo_id, sum(cantidad_restante) as cantidad, sum(valor_restante) as valor
               from inventarios.capas where empresa_id = $1 and vigente group by 1) c
       join inventarios.saldos_de_articulos s on s.empresa_id = $1 and s.articulo_id = c.articulo_id
      where (c.cantidad, c.valor) is distinct from (s.cantidad, s.valor)`,
    [empresaId],
  );
  return filas.map((f) => `capas del artículo ${f.articulo_id} no cuadran con su saldo`);
}

/**
 * Lo que está en tránsito interno no está en ninguna bodega (§5.11): Σ existencias + Σ en tránsito = saldo del
 * artículo en la empresa. En tránsito = la salida de un traslado vigente que todavía no se recibió.
 */
async function transitoDesviado(empresaId: string): Promise<string[]> {
  const filas = await comoPropietario<{ articulo_id: string; bodegas: string; transito: string; saldo: string }>(
    `select s.articulo_id, coalesce(e.suma, 0)::text as bodegas, coalesce(t.suma, 0)::text as transito, s.cantidad::text as saldo
       from inventarios.saldos_de_articulos s
       left join (select articulo_id, sum(cantidad) as suma from inventarios.existencias
                   where empresa_id = $1 group by 1) e on e.articulo_id = s.articulo_id
       left join (select m.articulo_id, sum(-m.cantidad) as suma
                    from inventarios.movimientos m join inventarios.documentos d on d.id = m.documento_id
                   where m.empresa_id = $1 and m.vigente and d.estado_de_traslado = 'en_transito'
                   group by 1) t on t.articulo_id = s.articulo_id
      where s.empresa_id = $1 and coalesce(e.suma, 0) + coalesce(t.suma, 0) <> s.cantidad`,
    [empresaId],
  );
  return filas.map(
    (f) => `tránsito del artículo ${f.articulo_id}: bodegas ${f.bodegas} + tránsito ${f.transito} <> ${f.saldo}`,
  );
}

/**
 * El «Cuadre del kardex» de la empresa (§13, R-11): las cachés (`existencias`, `saldos_de_articulos`, `capas`) contra
 * la suma de los movimientos. Debe volver vacío; los problemas vienen como texto para verlos en el fallo de la prueba.
 */
export async function cuadreDelKardex(empresaId: string): Promise<string[]> {
  return [
    ...(await existenciasDesviadas(empresaId)),
    ...(await saldosDesviados(empresaId)),
    ...(await capasDesviadas(empresaId)),
    ...(await transitoDesviado(empresaId)),
  ];
}
