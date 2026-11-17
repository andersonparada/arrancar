import { sql, type SQL } from 'drizzle-orm';
import type { Transaccion } from '../../../core/base-datos/conexion.js';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type {
  AjusteDelMes,
  AplicacionManualDelMes,
  FiltroDeAjustesDelMes,
  PagoAAperturaDelMes,
  SeccionDeAjustes,
} from '../../aplicacion/puertos/puertos-de-reportes-de-control.js';
import type { CausaDeAjuste } from '../../dominio/ajustes.js';
import { numeroDelPago } from '../../dominio/pagos.js';
import { nombreDe } from './nombres-de-personas.sql.js';

type Fila = Record<string, string | number | boolean | null>;

const textoONulo = (valor: unknown): string | null => (valor === null || valor === undefined ? null : String(valor));
const dia = (columna: string): SQL => sql.raw(`(${columna} at time zone 'America/Guatemala')::date`);
const persona = (alias: string): SQL => sql.raw(nombreDe(alias));

function aAjuste(fila: Fila): AjusteDelMes {
  return {
    id: String(fila.id),
    fecha: String(fila.fecha),
    documentoId: String(fila.documento_id),
    serie: textoONulo(fila.serie),
    numero: String(fila.numero),
    emisionDelDocumento: String(fila.emision),
    proveedorId: String(fila.proveedor_id),
    proveedorNombre: String(fila.proveedor_nombre),
    causa: String(fila.causa) as CausaDeAjuste,
    numeroDelPago: fila.pago_numero === null ? null : numeroDelPago(Number(fila.pago_numero), Number(fila.pago_anio)),
    montoCentavos: aCentavos(String(fila.monto)),
    referencia: textoONulo(fila.referencia),
    motivo: String(fila.motivo),
    registro: textoONulo(fila.registro),
    estado: fila.estado === 'anulado' ? 'anulado' : 'vigente',
    anuladoPor: textoONulo(fila.anulado_por),
    anuladoEn: textoONulo(fila.anulado_en),
    motivoDeAnulacion: textoONulo(fila.motivo_de_anulacion),
  };
}

const SELECCION_DE_AJUSTES = sql`
    select a.id::text, a.fecha::text, a.documento_id::text, d.serie, d.numero, d.fecha_emision::text as emision,
           a.proveedor_id::text, t.nombre_mostrar as proveedor_nombre, a.causa, pg.numero as pago_numero,
           pg.anio_de_numero as pago_anio, a.monto::text, a.referencia, a.motivo, ${persona('u')} as registro,
           a.estado, ${persona('ua')} as anulado_por, a.anulado_en::text, a.motivo_de_anulacion
      from cuentas_por_pagar.ajustes_de_saldo a
      join cuentas_por_pagar.documentos d on d.id = a.documento_id
      join terceros.proveedores pr on pr.id = a.proveedor_id
      join terceros.terceros t on t.id = pr.tercero_id
      left join cuentas_por_pagar.pagos pg on pg.id = a.pago_id
      left join core.usuarios u on u.id = a.creado_por
      left join core.usuarios ua on ua.id = a.anulado_por`;

/** Cuándo un ajuste es de la sección: fechado en el mes, o anulado en el mes pero fechado en otro. */
function condicionDeLaSeccion({ desde, hasta }: FiltroDeAjustesDelMes, seccion: SeccionDeAjustes): SQL {
  const delMes = sql`a.fecha between ${desde}::date and ${hasta}::date`;
  if (seccion === 'del_mes') return delMes;
  return sql`${dia('a.anulado_en')} between ${desde}::date and ${hasta}::date and not (${delMes})`;
}

/** Los ajustes fechados en el mes (sección 1) o anulados en el mes pero de otra fecha (sección 2), vigentes y anulados. */
export async function ajustesDelMes(
  transaccion: Transaccion,
  filtro: FiltroDeAjustesDelMes,
  seccion: SeccionDeAjustes,
): Promise<AjusteDelMes[]> {
  const { empresaId, proveedorId, causa } = filtro;
  const delProveedor = proveedorId ? sql`and a.proveedor_id = ${proveedorId}::uuid` : sql``;
  const dela = causa ? sql`and a.causa = ${causa}` : sql``;
  const { rows } = await transaccion.execute(sql`${SELECCION_DE_AJUSTES}
     where a.empresa_id = ${empresaId}::uuid and ${condicionDeLaSeccion(filtro, seccion)} ${delProveedor} ${dela}
     order by a.fecha, a.creado_en, a.id`);
  return (rows as Fila[]).map(aAjuste);
}

const numeroConSerie = (serie: unknown, numero: unknown): string => (serie ? `${serie}-${numero}` : String(numero));

const SELECCION_DE_MANUALES = sql`
    select ap.id::text, ap.fecha::text, ap.proveedor_id::text, t.nombre_mostrar as proveedor_nombre,
           n.serie as nota_serie, n.numero as nota_numero, c.serie as cargo_serie, c.numero as cargo_numero,
           ap.monto::text, ap.referencia, ${persona('u')} as registro
      from cuentas_por_pagar.aplicaciones_de_notas ap
      join cuentas_por_pagar.documentos n on n.id = ap.nota_id
      join cuentas_por_pagar.documentos c on c.id = ap.cargo_id
      join terceros.proveedores pr on pr.id = ap.proveedor_id
      join terceros.terceros t on t.id = pr.tercero_id
      left join core.usuarios u on u.id = ap.creado_por`;

const aManual = (fila: Fila): AplicacionManualDelMes => ({
  id: String(fila.id),
  fecha: String(fila.fecha),
  proveedorId: String(fila.proveedor_id),
  proveedorNombre: String(fila.proveedor_nombre),
  nota: numeroConSerie(fila.nota_serie, fila.nota_numero),
  cargo: numeroConSerie(fila.cargo_serie, fila.cargo_numero),
  montoCentavos: aCentavos(String(fila.monto)),
  referencia: textoONulo(fila.referencia),
  registro: textoONulo(fila.registro),
});

/** Las compensaciones manuales entre una nota y un cargo con fecha en el mes (sección 3). */
export async function aplicacionesManualesDelMes(
  transaccion: Transaccion,
  { empresaId, desde, hasta, proveedorId }: FiltroDeAjustesDelMes,
): Promise<AplicacionManualDelMes[]> {
  const delProveedor = proveedorId ? sql`and ap.proveedor_id = ${proveedorId}::uuid` : sql``;
  const { rows } = await transaccion.execute(sql`${SELECCION_DE_MANUALES}
     where ap.empresa_id = ${empresaId}::uuid and ap.forma = 'manual'
       and ap.fecha between ${desde}::date and ${hasta}::date ${delProveedor}
     order by ap.fecha, ap.creado_en, ap.id`);
  return (rows as Fila[]).map(aManual);
}

const SELECCION_DE_APERTURA = sql`
    select p.id::text, p.numero, p.anio_de_numero, p.fecha::text, p.proveedor_id::text,
           t.nombre_mostrar as proveedor_nombre, p.monto::text, p.motivo, p.con_carga_cerrada,
           ${persona('u')} as registro, p.estado
      from cuentas_por_pagar.pagos p
      join terceros.proveedores pr on pr.id = p.proveedor_id
      join terceros.terceros t on t.id = pr.tercero_id
      left join core.usuarios u on u.id = p.creado_por`;

const aApertura = (fila: Fila): PagoAAperturaDelMes => ({
  id: String(fila.id),
  numeroDelPago: numeroDelPago(Number(fila.numero), Number(fila.anio_de_numero)),
  fecha: String(fila.fecha),
  proveedorId: String(fila.proveedor_id),
  proveedorNombre: String(fila.proveedor_nombre),
  montoCentavos: aCentavos(String(fila.monto)),
  motivo: textoONulo(fila.motivo),
  conCargaCerrada: fila.con_carga_cerrada === true,
  registro: textoONulo(fila.registro),
  estado: fila.estado === 'anulado' ? 'anulado' : 'vigente',
});

/** Los pagos contra la cuenta de apertura con fecha en el mes, vigentes y anulados (sección 4). */
export async function pagosAAperturaDelMes(
  transaccion: Transaccion,
  { empresaId, desde, hasta, proveedorId }: FiltroDeAjustesDelMes,
): Promise<PagoAAperturaDelMes[]> {
  const delProveedor = proveedorId ? sql`and p.proveedor_id = ${proveedorId}::uuid` : sql``;
  const { rows } = await transaccion.execute(sql`${SELECCION_DE_APERTURA}
     where p.empresa_id = ${empresaId}::uuid and p.forma = 'cuenta_de_apertura'
       and p.fecha between ${desde}::date and ${hasta}::date ${delProveedor}
     order by p.fecha, p.anio_de_numero, p.numero`);
  return (rows as Fila[]).map(aApertura);
}
