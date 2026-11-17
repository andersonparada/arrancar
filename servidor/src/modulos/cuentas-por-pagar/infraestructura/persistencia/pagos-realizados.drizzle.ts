import { sql, type SQL } from 'drizzle-orm';
import type { Transaccion } from '../../../core/base-datos/conexion.js';
import type { PaginacionDeDocumentos } from '../../aplicacion/puertos/puertos-de-consultas.js';
import type {
  FiltroDePagosRealizados,
  LineaDePagoRealizado,
  PaginaDePagosRealizados,
  TotalDePagosPorForma,
} from '../../aplicacion/puertos/puertos-de-reportes-de-pagos.js';
import { numeroDelPago, type FormaDePago } from '../../dominio/pagos.js';
import { nombreDe } from './nombres-de-personas.sql.js';

type Fila = Record<string, string | number | boolean | null>;

const textoONulo = (valor: unknown): string | null => (valor === null || valor === undefined ? null : String(valor));
const texto = (valor: unknown): string => String(valor ?? '');

const ESTADO_DEL_PAGO = { vigentes: 'vigente', anulados: 'anulado' } as const;

/** Las condiciones que solo entran si el filtro las pide. */
function condicionesOpcionales(filtro: FiltroDePagosRealizados): SQL[] {
  const { proveedorId, forma, cuentaBancariaId, estado, posfechados, mismaPersona } = filtro;
  const condiciones: SQL[] = [];
  if (proveedorId) condiciones.push(sql`p.proveedor_id = ${proveedorId}::uuid`);
  if (forma) condiciones.push(sql`p.forma = ${forma}`);
  if (cuentaBancariaId) condiciones.push(sql`m.cuenta_bancaria_id = ${cuentaBancariaId}::uuid`);
  if (estado !== 'todos') condiciones.push(sql`p.estado = ${ESTADO_DEL_PAGO[estado]}`);
  if (posfechados) condiciones.push(sql`p.fecha > (p.creado_en at time zone 'America/Guatemala')::date`);
  if (mismaPersona) condiciones.push(sql`p.creado_por in (d.creado_por, d.registrado_por, d.autorizado_por)`);
  return condiciones;
}

/** Las líneas de pago de la empresa con lo que sus filtros necesitan; los nombres de las personas se unen aparte. */
function lineasFiltradas(filtro: FiltroDePagosRealizados, uniones: SQL = sql``): SQL {
  const { empresaId, desde, hasta } = filtro;
  const condiciones: SQL[] = [
    sql`p.empresa_id = ${empresaId}::uuid and a.empresa_id = ${empresaId}::uuid`,
    sql`p.fecha between ${desde}::date and ${hasta}::date`,
    ...condicionesOpcionales(filtro),
  ];
  return sql`from cuentas_por_pagar.aplicaciones_de_pagos a
      join cuentas_por_pagar.pagos p on p.id = a.pago_id
      join cuentas_por_pagar.documentos d on d.id = a.cargo_id
      left join bancos.movimientos m on m.id = p.movimiento_id ${uniones}
     where ${sql.join(condiciones, sql` and `)}`;
}

/** Lo de la línea que viene del pago y de Bancos. */
const delPago = (fila: Fila) => ({
  pagoId: texto(fila.pago_id),
  numeroDelPago: numeroDelPago(Number(fila.numero), Number(fila.anio_de_numero)),
  fecha: texto(fila.fecha),
  forma: texto(fila.forma) as FormaDePago,
  documentoBancario: textoONulo(fila.documento_bancario),
  cuenta: textoONulo(fila.cuenta),
  proveedorId: texto(fila.proveedor_id),
  proveedorNombre: texto(fila.proveedor_nombre),
  registroElPago: textoONulo(fila.registro_el_pago),
  estado: (fila.estado === 'anulado' ? 'anulado' : 'vigente') as 'vigente' | 'anulado',
  fechaDeAnulacion: textoONulo(fila.fecha_de_anulacion),
  motivoDeAnulacion: textoONulo(fila.motivo_de_anulacion),
});

/** Lo de la línea que viene del documento pagado, su contraseña y quién lo registró y autorizó. */
const delDocumento = (fila: Fila) => ({
  contrasena: numeroDelPago(Number(fila.contrasena_numero), Number(fila.contrasena_anio)),
  documentoId: texto(fila.documento_id),
  serie: textoONulo(fila.serie),
  numeroDelDocumento: texto(fila.numero_del_documento),
  monto: texto(fila.monto),
  retencionDescontada: texto(fila.retencion),
  cubre: texto(fila.cubre),
  registroElDocumento: textoONulo(fila.registro_el_documento),
  completoElDocumento: textoONulo(fila.completo_el_documento),
  autorizoElDocumento: textoONulo(fila.autorizo_el_documento),
  misma: fila.misma === true,
});

const aLinea = (fila: Fila): LineaDePagoRealizado => ({ ...delPago(fila), ...delDocumento(fila) });

const COLUMNAS_DE_LA_LINEA =
  sql.raw(`p.id::text as pago_id, p.numero, p.anio_de_numero, p.fecha::text as fecha, p.forma,
       coalesce(m.referencia, p.referencia) as documento_bancario, cb.nombre as cuenta,
       p.proveedor_id::text as proveedor_id, t.nombre_mostrar as proveedor_nombre,
       c.numero as contrasena_numero, c.anio_de_numero as contrasena_anio, d.id::text as documento_id, d.serie,
       d.numero as numero_del_documento, a.monto::text as monto, a.retencion_descontada::text as retencion,
       (a.monto + a.retencion_descontada)::text as cubre,
       ${nombreDe('ud')} as registro_el_documento,
       case when d.registrado_por is distinct from d.creado_por then ${nombreDe('ur')} end as completo_el_documento,
       ${nombreDe('ua')} as autorizo_el_documento, ${nombreDe('up')} as registro_el_pago,
       p.creado_por in (d.creado_por, d.registrado_por, d.autorizado_por) as misma, p.estado,
       p.fecha_de_anulacion::text as fecha_de_anulacion, p.motivo_de_anulacion`);

const UNIONES_DE_LA_LINEA = sql`
      join cuentas_por_pagar.contrasenas c on c.id = a.contrasena_id
      join terceros.proveedores pr on pr.id = p.proveedor_id
      join terceros.terceros t on t.id = pr.tercero_id
      left join bancos.cuentas_bancarias cb on cb.id = m.cuenta_bancaria_id
      left join core.usuarios ud on ud.id = d.creado_por
      left join core.usuarios ur on ur.id = d.registrado_por
      left join core.usuarios ua on ua.id = d.autorizado_por
      left join core.usuarios up on up.id = p.creado_por`;

/** Las líneas de la página pedida (o todas, para Excel), con quién registró, autorizó y pagó. */
async function lineas(
  transaccion: Transaccion,
  filtro: FiltroDePagosRealizados,
  pagina: PaginacionDeDocumentos | null,
): Promise<LineaDePagoRealizado[]> {
  const limite = pagina ? sql`limit ${pagina.limite} offset ${(pagina.pagina - 1) * pagina.limite}` : sql``;
  const { rows } = await transaccion.execute(sql`
    select ${COLUMNAS_DE_LA_LINEA}
      ${lineasFiltradas(filtro, UNIONES_DE_LA_LINEA)}
    order by p.fecha, p.anio_de_numero, p.numero, d.fecha_emision, d.numero ${limite}`);
  return (rows as Fila[]).map(aLinea);
}

/** Las sumas por forma y estado de todas las líneas filtradas. */
async function totales(transaccion: Transaccion, filtro: FiltroDePagosRealizados): Promise<TotalDePagosPorForma[]> {
  const { rows } = await transaccion.execute(sql`
    select p.forma, p.estado, count(*)::int as lineas, sum(a.monto)::text as monto,
           sum(a.retencion_descontada)::text as retencion
      ${lineasFiltradas(filtro)}
     group by p.forma, p.estado order by p.forma, p.estado`);
  return (rows as Fila[]).map((fila) => ({
    forma: texto(fila.forma) as FormaDePago,
    estado: fila.estado === 'anulado' ? 'anulado' : 'vigente',
    lineas: Number(fila.lineas),
    monto: texto(fila.monto),
    retencion: texto(fila.retencion),
  }));
}

/** R6: los pagos del rango como líneas, con sus totales. Corre dentro de la unidad de trabajo, con RLS de la empresa. */
export async function pagosRealizados(
  transaccion: Transaccion,
  filtro: FiltroDePagosRealizados,
  pagina: PaginacionDeDocumentos | null,
): Promise<PaginaDePagosRealizados> {
  const porForma = await totales(transaccion, filtro);
  return {
    filas: await lineas(transaccion, filtro, pagina),
    total: porForma.reduce((suma, { lineas: cantidad }) => suma + cantidad, 0),
    totales: porForma,
  };
}
