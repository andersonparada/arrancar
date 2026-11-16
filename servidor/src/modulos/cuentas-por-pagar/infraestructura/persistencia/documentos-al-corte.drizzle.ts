import { sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { Transaccion } from '../../../core/base-datos/conexion.js';
import type { PaginacionDeDocumentos } from '../../aplicacion/puertos/puertos-de-consultas.js';
import type {
  FilaDeDocumentoAlCorte,
  FiltroDeDocumentosAlCorte,
  PaginaDeDocumentosAlCorte,
} from '../../aplicacion/puertos/puertos-de-saldos-al-corte.js';
import { numeroDeContrasena } from '../../dominio/contrasena.js';
import type { EstadoDePago } from '../../dominio/pagos.js';
import type { OrigenDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
import { condicionDeAutorizacion, parametrosDe, saldosAlCorte } from './saldos-al-corte.sql.js';

type Fila = Record<string, string | number | boolean | null>;

/** Lo que filtra por el documento mismo: tipo, origen, emisión y retenciones por practicar. */
function condicionesDelDocumento(f: FiltroDeDocumentosAlCorte): SQL[] {
  return [
    f.tipo ? sql`s.tipo = ${f.tipo}` : sql`true`,
    f.origen ? sql`s.origen = ${f.origen}` : sql`true`,
    f.emitidosDesde ? sql`s.fecha_emision >= ${f.emitidosDesde}::date` : sql`true`,
    f.emitidosHasta ? sql`s.fecha_emision <= ${f.emitidosHasta}::date` : sql`true`,
    f.conRetencionesPorPracticar ? sql`s.retenciones_por_practicar > 0` : sql`true`,
  ];
}

/** Lo que filtra por vencimiento y contraseña (siempre sobre cargos con saldo). */
function condicionesDeVencimiento(f: FiltroDeDocumentosAlCorte): SQL[] {
  return [
    f.vencidos ? sql`(s.saldo > 0 and s.vencimiento < ${f.corte}::date)` : sql`true`,
    f.venceHasta ? sql`(s.saldo > 0 and s.vencimiento between ${f.corte}::date and ${f.venceHasta}::date)` : sql`true`,
    f.sinContrasena
      ? sql`not exists (select 1 from cuentas_por_pagar.contrasena_documentos cd where cd.documento_id = s.id and cd.vigente)`
      : sql`true`,
  ];
}

/** Todos los filtros: cargos, autorización, estado de pago (sin él, solo con saldo) y los dos grupos anteriores. */
function condicionesDeDocumentos(f: FiltroDeDocumentosAlCorte): SQL {
  const estado = f.estadoDePago ? sql`s.estado_de_pago = ${f.estadoDePago}` : sql`s.saldo > 0`;
  return sql.join(
    [
      sql`not s.es_nota`,
      condicionDeAutorizacion(f.autorizacion),
      estado,
      ...condicionesDelDocumento(f),
      ...condicionesDeVencimiento(f),
    ],
    sql` and `,
  );
}

const SUMAS_DE_TODO_LO_FILTRADO = sql.raw(`count(*) over ()::int as total_filas,
       sum(s.total) over ()::text as suma_total, sum(s.retenciones) over ()::text as suma_retenciones,
       sum(s.pagado) over ()::text as suma_pagado, sum(s.saldo) over ()::text as suma_saldo,
       sum(s.comprometido) over ()::text as suma_comprometido`);

/** La página pedida de los documentos filtrados; sin página, todos. */
function paginar(pagina: PaginacionDeDocumentos | null): SQL {
  if (!pagina) return sql``;
  return sql`limit ${pagina.limite} offset ${(pagina.pagina - 1) * pagina.limite}`;
}

const centavosDe = (valor: unknown): number => aCentavos(String(valor ?? '0'));
const textoONulo = (valor: unknown): string | null => (valor === null || valor === undefined ? null : String(valor));

function contrasenaDe(fila: Fila): FilaDeDocumentoAlCorte['contrasena'] {
  if (fila.contrasena_numero === null) return null;
  return {
    numero: numeroDeContrasena(Number(fila.contrasena_numero), Number(fila.contrasena_anio)),
    pagoPrometido: String(fila.pago_prometido),
  };
}

/** Qué documento es y cómo va su pago. */
function datosDelDocumentoDe(fila: Fila) {
  return {
    id: String(fila.id),
    proveedorId: String(fila.proveedor_id),
    proveedorNombre: String(fila.proveedor_nombre),
    proveedorNit: textoONulo(fila.proveedor_nit),
    tipo: String(fila.tipo) as TipoDeDocumento,
    origen: String(fila.origen) as OrigenDeDocumento,
    serie: textoONulo(fila.serie),
    numero: String(fila.numero),
    fechaEmision: String(fila.fecha_emision),
    vencimiento: textoONulo(fila.vencimiento),
    diasVencido: fila.dias_vencido === null ? null : Number(fila.dias_vencido),
    estadoDePago: String(fila.estado_de_pago) as EstadoDePago,
    autorizado: fila.autorizado === true || fila.autorizado === 't',
    contrasena: contrasenaDe(fila),
  };
}

/** Los montos del documento en centavos; lo propio de un saldo inicial va en `null` en los del libro. */
function montosDelDocumentoDe(fila: Fila) {
  const neto = centavosDe(fila.total) - centavosDe(fila.retenciones);
  const esSaldoInicial = fila.saldo_al_inicio !== null;
  return {
    totalCentavos: centavosDe(fila.total),
    retencionesCentavos: centavosDe(fila.retenciones),
    netoCentavos: neto,
    anterioresAlInicioCentavos: esSaldoInicial ? neto - centavosDe(fila.saldo_al_inicio) : null,
    aplicadoCentavos: centavosDe(fila.aplicado),
    pagadoCentavos: centavosDe(fila.pagado),
    ajustadoCentavos: centavosDe(fila.ajustado),
    saldoCentavos: centavosDe(fila.saldo),
    comprometidoCentavos: centavosDe(fila.comprometido),
    retencionesPorPracticarCentavos: esSaldoInicial ? centavosDe(fila.retenciones_por_practicar) : null,
  };
}

const aFilaDeDocumento = (fila: Fila): FilaDeDocumentoAlCorte => ({
  ...datosDelDocumentoDe(fila),
  ...montosDelDocumentoDe(fila),
});

/** Las sumas de todo lo filtrado vienen repetidas en cada fila; sin filas, todo es cero. */
function totalesDe(primera: Fila | undefined): PaginaDeDocumentosAlCorte['totales'] {
  return {
    cantidad: Number(primera?.total_filas ?? 0),
    totalCentavos: centavosDe(primera?.suma_total),
    retencionesCentavos: centavosDe(primera?.suma_retenciones),
    pagadoCentavos: centavosDe(primera?.suma_pagado),
    saldoCentavos: centavosDe(primera?.suma_saldo),
    comprometidoCentavos: centavosDe(primera?.suma_comprometido),
  };
}

const COLUMNAS_DE_LA_FILA =
  sql.raw(`f.id::text as id, f.proveedor_id::text as proveedor_id, t.nombre_mostrar as proveedor_nombre,
       t.nit as proveedor_nit, f.tipo, f.origen, f.serie, f.numero, f.fecha_emision::text as fecha_emision,
       f.vencimiento::text as vencimiento, f.dias_vencido, f.total::text as total, f.retenciones::text as retenciones,
       f.neto::text as neto, f.saldo_al_inicio::text as saldo_al_inicio, f.aplicado::text as aplicado,
       f.pagado::text as pagado, f.ajustado::text as ajustado, f.saldo::text as saldo,
       f.comprometido::text as comprometido, f.estado_de_pago, f.autorizado,
       f.retenciones_por_practicar::text as retenciones_por_practicar,
       c.numero as contrasena_numero, c.anio_de_numero as contrasena_anio, c.fecha_de_pago::text as pago_prometido,
       f.total_filas, f.suma_total, f.suma_retenciones, f.suma_pagado, f.suma_saldo, f.suma_comprometido`);

/**
 * Los cargos al corte (R2) con su proveedor y su contraseña vigente. Los totales salen de la misma CTE con funciones de
 * ventana, así que no hay un conteo aparte sobre nueve uniones; sin página (Excel) se devuelven todos.
 */
export async function documentosAlCorte(
  transaccion: Transaccion,
  filtro: FiltroDeDocumentosAlCorte,
  pagina: PaginacionDeDocumentos | null,
): Promise<PaginaDeDocumentosAlCorte> {
  const { rows } = await transaccion.execute(sql`
    with ${saldosAlCorte(parametrosDe(filtro))},
    filtradas as (
      select s.*, ${SUMAS_DE_TODO_LO_FILTRADO} from saldos s where ${condicionesDeDocumentos(filtro)}),
    pagina as (select * from filtradas order by vencimiento nulls last, fecha_emision, id ${paginar(pagina)})
    select ${COLUMNAS_DE_LA_FILA}
      from pagina f
      join terceros.proveedores p on p.id = f.proveedor_id
      join terceros.terceros t on t.id = p.tercero_id
      left join cuentas_por_pagar.contrasena_documentos cd on cd.documento_id = f.id and cd.vigente
      left join cuentas_por_pagar.contrasenas c on c.id = cd.contrasena_id
     order by f.vencimiento nulls last, f.fecha_emision, f.id`);
  const filas = rows as Fila[];
  return { filas: filas.map(aFilaDeDocumento), totales: totalesDe(filas[0]) };
}
