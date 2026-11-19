import { sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  FilaDeListaDePagos,
  FiltroDeListaDePagos,
  ListaDePagos,
  PaginaDeListaDePagos,
} from '../../aplicacion/puertos/puertos-de-lista-de-pagos.js';
import type { FormaDePago } from '../../dominio/pagos.js';
import { fechaDeEfectoDelPagoSql } from './fecha-de-efecto-del-pago.sql.js';
import { FIN_DE_MES_COBRADO } from './saldos-al-corte.sql.js';

const EFECTO_DEL_PAGO = fechaDeEfectoDelPagoSql(sql.raw('p.fecha'), FIN_DE_MES_COBRADO);

type Fila = Record<string, string | number | boolean | null>;

const texto = (valor: unknown): string => String(valor ?? '');
const textoONulo = (valor: unknown): string | null => (valor === null || valor === undefined ? null : String(valor));

/** Las condiciones de igualdad que entran si el filtro las pide. */
function igualdades(filtro: FiltroDeListaDePagos): SQL[] {
  const { proveedorId, contrasenaId, retiroId, forma, cuentaBancariaId } = filtro;
  const lista: SQL[] = [];
  if (proveedorId) lista.push(sql`p.proveedor_id = ${proveedorId}::uuid`);
  if (contrasenaId) {
    lista.push(
      sql`exists (select 1 from cuentas_por_pagar.aplicaciones_de_pagos a where a.pago_id = p.id and a.contrasena_id = ${contrasenaId}::uuid)`,
    );
  }
  if (retiroId) lista.push(sql`p.retiro_id = ${retiroId}::uuid`);
  if (forma) lista.push(sql`p.forma = ${forma}`);
  if (cuentaBancariaId) lista.push(sql`m.cuenta_bancaria_id = ${cuentaBancariaId}::uuid`);
  return lista;
}

/** El estado, los posfechados y el rango de fechas del pago. */
function deEstadoYFechas(filtro: FiltroDeListaDePagos, hoy: string): SQL[] {
  const { estado, posfechado, desde, hasta } = filtro;
  const lista: SQL[] = [];
  if (estado !== 'todos') lista.push(sql`p.estado = ${estado}`);
  if (posfechado !== undefined) {
    const comprometido = sql`(p.estado = 'vigente' and ${EFECTO_DEL_PAGO} > ${hoy}::date)`;
    lista.push(posfechado ? comprometido : sql`not ${comprometido}`);
  }
  if (desde) lista.push(sql`p.fecha >= ${desde}::date`);
  if (hasta) lista.push(sql`p.fecha <= ${hasta}::date`);
  return lista;
}

const condiciones = (filtro: FiltroDeListaDePagos, hoy: string): SQL[] => [
  ...igualdades(filtro),
  ...deEstadoYFechas(filtro, hoy),
];

const UNIONES = sql`
  from cuentas_por_pagar.pagos p
  join terceros.proveedores pr on pr.id = p.proveedor_id
  join terceros.terceros t on t.id = pr.tercero_id
  left join bancos.movimientos m on m.id = p.movimiento_id
  left join bancos.cheques ch on ch.movimiento_id = m.id
  left join bancos.conciliaciones cn on cn.id = m.conciliacion_id and cn.estado = 'autorizada'
  left join bancos.cuentas_bancarias cb on cb.id = m.cuenta_bancaria_id
  left join cuentas_por_pagar.retiros_de_efectivo r on r.id = p.retiro_id`;

const COLUMNAS = sql`p.id::text as id, p.numero, p.anio_de_numero, p.proveedor_id::text as proveedor_id,
  t.nombre_mostrar as proveedor_nombre, t.nit as proveedor_nit, p.forma, p.fecha::text as fecha, p.monto::text as monto,
  p.estado, p.fecha_de_anulacion::text as fecha_de_anulacion, m.cuenta_bancaria_id::text as cuenta_id,
  cb.nombre as cuenta_nombre, coalesce(ch.numero, m.numero) as numero_del_documento, r.id::text as retiro_id,
  r.numero as retiro_numero, r.anio_de_numero as retiro_anio, r.custodio,
  ${EFECTO_DEL_PAGO}::text as fecha_de_efecto`;

const aMovimiento = (fila: Fila): FilaDeListaDePagos['movimiento'] =>
  fila.cuenta_id === null
    ? null
    : {
        cuentaBancariaId: texto(fila.cuenta_id),
        cuentaBancariaNombre: texto(fila.cuenta_nombre),
        numero: fila.numero_del_documento === null ? null : Number(fila.numero_del_documento),
      };

const aRetiro = (fila: Fila): FilaDeListaDePagos['retiro'] =>
  fila.retiro_id === null
    ? null
    : {
        id: texto(fila.retiro_id),
        numero: Number(fila.retiro_numero),
        anioDeNumero: Number(fila.retiro_anio),
        custodio: texto(fila.custodio),
      };

function aFila(fila: Fila, contrasenas: FilaDeListaDePagos['contrasenas']): FilaDeListaDePagos {
  return {
    id: texto(fila.id),
    numero: Number(fila.numero),
    anioDeNumero: Number(fila.anio_de_numero),
    proveedor: {
      id: texto(fila.proveedor_id),
      nombre: texto(fila.proveedor_nombre),
      nit: textoONulo(fila.proveedor_nit),
    },
    contrasenas,
    forma: texto(fila.forma) as FormaDePago,
    fecha: texto(fila.fecha),
    fechaDeEfecto: texto(fila.fecha_de_efecto),
    montoCentavos: aCentavos(texto(fila.monto)),
    estado: fila.estado === 'anulado' ? 'anulado' : 'vigente',
    fechaDeAnulacion: textoONulo(fila.fecha_de_anulacion),
    movimiento: aMovimiento(fila),
    retiro: aRetiro(fila),
  };
}

/** Las contraseñas de cada pago (por sus líneas), por número, de una sola vez para toda la página. */
async function contrasenasDe(pagoIds: string[]): Promise<Map<string, FilaDeListaDePagos['contrasenas']>> {
  const porPago = new Map<string, FilaDeListaDePagos['contrasenas']>();
  if (pagoIds.length === 0) return porPago;
  const ids = sql.join(
    pagoIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const { rows } = await transaccionEnCurso().execute(sql`
    select distinct a.pago_id::text as pago_id, c.id::text as id, c.numero, c.anio_de_numero
      from cuentas_por_pagar.aplicaciones_de_pagos a
      join cuentas_por_pagar.contrasenas c on c.id = a.contrasena_id
     where a.pago_id in (${ids})
     order by c.anio_de_numero, c.numero`);
  for (const fila of rows as Fila[]) {
    const lista = porPago.get(texto(fila.pago_id)) ?? [];
    lista.push({ id: texto(fila.id), numero: Number(fila.numero), anioDeNumero: Number(fila.anio_de_numero) });
    porPago.set(texto(fila.pago_id), lista);
  }
  return porPago;
}

/** La lista de pagos con seguridad por empresa (RLS), de los más nuevos a los más viejos. */
export class ListaDePagosDrizzle implements ListaDePagos {
  async listar(filtro: FiltroDeListaDePagos, hoy: string): Promise<PaginaDeListaDePagos> {
    const donde = condiciones(filtro, hoy);
    const clausula = donde.length > 0 ? sql`where ${sql.join(donde, sql` and `)}` : sql``;
    const transaccion = transaccionEnCurso();
    const { rows: cuenta } = await transaccion.execute(sql`select count(*)::int as total ${UNIONES} ${clausula}`);
    const { rows } = await transaccion.execute(sql`
      select ${COLUMNAS} ${UNIONES} ${clausula}
      order by p.fecha desc, p.anio_de_numero desc, p.numero desc
      limit ${filtro.limite} offset ${(filtro.pagina - 1) * filtro.limite}`);
    const filas = rows as Fila[];
    const contrasenas = await contrasenasDe(filas.map(({ id }) => texto(id)));
    return {
      filas: filas.map((fila) => aFila(fila, contrasenas.get(texto(fila.id)) ?? [])),
      total: Number((cuenta[0] as Fila).total),
    };
  }
}
