import { sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  BaseDelCorte,
  ConsultasDeSaldosAlCorte,
  DatosParaAvisosDelCorte,
  FiltroDeDocumentosAlCorte,
  PaginaDeDocumentosAlCorte,
} from '../../aplicacion/puertos/puertos-de-saldos-al-corte.js';
import type { PaginacionDeDocumentos } from '../../aplicacion/puertos/puertos-de-consultas.js';
import type {
  ConsultasDeReportesDeProveedor,
  ContrasenaPorPagar,
  FiltroDeContrasenasPorPagar,
  FiltroDeSaldosAFavor,
  RangoDelEstado,
} from '../../aplicacion/puertos/puertos-de-reportes-de-proveedor.js';
import type { MovimientoDelProveedor, RetencionDelDocumento } from '../../dominio/estado-de-cuenta.js';
import type { NotaAlCorte } from '../../dominio/saldos-a-favor.js';
import { contrasenasPorPagar } from './contrasenas-por-pagar.drizzle.js';
import { movimientosDelProveedor, retencionesDelProveedor } from './movimientos-del-proveedor.drizzle.js';
import { notasConSaldoAlCorte } from './saldos-a-favor.drizzle.js';
import { numeroDelPago } from '../../dominio/pagos.js';
import type { SaldoDeProveedor } from '../../dominio/saldos-por-nit.js';
import type { TramoDeAntiguedad } from '../../dominio/saldo-al-corte.js';
import { documentosAlCorte } from './documentos-al-corte.drizzle.js';
import { condicionDeAutorizacion, pagoCuentaAlCorte, parametrosDe, saldosAlCorte } from './saldos-al-corte.sql.js';

type Fila = Record<string, string | number | boolean | null>;

/** Cuándo un cargo cae en cada tramo, según los días vencidos al corte (las notas no tienen tramo). */
const CONDICION_DEL_TRAMO: Record<TramoDeAntiguedad, string> = {
  por_vencer: 's.dias_vencido <= 0',
  de_1_a_30: 's.dias_vencido between 1 and 30',
  de_31_a_60: 's.dias_vencido between 31 and 60',
  de_61_a_90: 's.dias_vencido between 61 and 90',
  mas_de_90: 's.dias_vencido > 90',
  sin_vencimiento: 's.vencimiento is null',
};

const sumaDeSaldo = (condicion: string, alias: string): SQL =>
  sql.raw(`coalesce(sum(s.saldo) filter (where ${condicion}), 0)::text as ${alias}`);

/** Las columnas de suma de cada proveedor: tramos, total de cargos, saldos a favor, comprometido y sin autorizar. */
function columnasDeSumas(): SQL {
  const tramos = Object.entries(CONDICION_DEL_TRAMO).map(([tramo, condicion]) =>
    sumaDeSaldo(`not s.es_nota and ${condicion}`, tramo),
  );
  return sql.join(
    [
      ...tramos,
      sumaDeSaldo('not s.es_nota', 'total_cargos'),
      sumaDeSaldo('s.es_nota', 'saldos_a_favor'),
      sumaDeSaldo('not s.es_nota and not s.autorizado', 'sin_autorizar'),
      sql.raw('coalesce(sum(s.comprometido), 0)::text as comprometido'),
    ],
    sql`, `,
  );
}

const centavosDe = (valor: unknown): number => aCentavos(String(valor ?? '0'));

function aSaldoDeProveedor(fila: Fila): SaldoDeProveedor {
  const tramos = Object.fromEntries(
    Object.keys(CONDICION_DEL_TRAMO).map((tramo) => [tramo, centavosDe(fila[tramo])]),
  ) as Record<TramoDeAntiguedad, number>;
  const totalCargos = centavosDe(fila.total_cargos);
  const saldosAFavor = centavosDe(fila.saldos_a_favor);
  return {
    proveedorId: String(fila.proveedor_id),
    nombre: String(fila.nombre),
    nit: fila.nit === null ? null : String(fila.nit),
    tramos,
    totalCargos,
    saldosAFavor,
    neto: totalCargos - saldosAFavor,
    comprometido: centavosDe(fila.comprometido),
    sinAutorizar: centavosDe(fila.sin_autorizar),
  };
}

/**
 * El saldo de los documentos a una fecha de corte (`docs/modulos/diseno-cp5-reportes.md` §9): una consulta propia, no la
 * de la lista de documentos. Calcula en SQL por proveedor y por documento; las reglas son las de `dominio/saldo-al-corte.ts`.
 * Corre dentro de la unidad de trabajo, con RLS de la empresa.
 */
export class ConsultaDeSaldosAlCorte implements ConsultasDeSaldosAlCorte, ConsultasDeReportesDeProveedor {
  /** La transacción de la unidad de trabajo en curso (la clase se arma al componer, antes de que haya una). */
  private get transaccion() {
    return transaccionEnCurso();
  }

  async proveedorExiste(proveedorId: string): Promise<boolean> {
    const { rows } = await this.transaccion.execute(
      sql`select 1 from terceros.proveedores where id = ${proveedorId}::uuid`,
    );
    return rows.length > 0;
  }

  async saldosPorProveedor(base: BaseDelCorte): Promise<SaldoDeProveedor[]> {
    const { rows } = await this.transaccion.execute(sql`
      with ${saldosAlCorte(parametrosDe(base))}
      select s.proveedor_id::text as proveedor_id, t.nombre_mostrar as nombre, t.nit, ${columnasDeSumas()}
        from saldos s
        join terceros.proveedores p on p.id = s.proveedor_id
        join terceros.terceros t on t.id = p.tercero_id
       where ${condicionDeAutorizacion(base.autorizacion)}
       group by s.proveedor_id, t.nombre_mostrar, t.nit`);
    return (rows as Fila[]).map(aSaldoDeProveedor);
  }

  async avisosDelCorte(base: BaseDelCorte): Promise<DatosParaAvisosDelCorte> {
    const [conteos] = (
      await this.transaccion.execute(sql`
      with ${saldosAlCorte(parametrosDe(base))}
      select count(*) filter (where origen = 'libro_de_compras' and fecha_emision < ${base.fechaDeInicio}::date)::int as anteriores,
             coalesce(sum(total) filter (where origen = 'libro_de_compras' and fecha_emision < ${base.fechaDeInicio}::date), 0)::text as anteriores_total,
             count(*) filter (where (creado_en at time zone 'America/Guatemala')::date > ${base.corte}::date)::int as tardios,
             coalesce(sum(total) filter (where (creado_en at time zone 'America/Guatemala')::date > ${base.corte}::date), 0)::text as tardios_total
        from docs`)
    ).rows as Fila[];
    return {
      anterioresAlInicio: {
        cantidad: Number(conteos?.anteriores ?? 0),
        totalCentavos: centavosDe(conteos?.anteriores_total),
      },
      registradosDespues: {
        cantidad: Number(conteos?.tardios ?? 0),
        totalCentavos: centavosDe(conteos?.tardios_total),
      },
      chequesCobradosAntes: await this.chequesCobradosAntes(base),
    };
  }

  /** Cheques posfechados que Bancos marcó cobrados en una conciliación autorizada del mes del corte, antes de su fecha. */
  private async chequesCobradosAntes({ empresaId, corte, proveedorId }: BaseDelCorte) {
    const delProveedor = proveedorId ? sql`and p.proveedor_id = ${proveedorId}::uuid` : sql``;
    const { rows } = await this.transaccion.execute(sql`
      select p.numero, p.anio_de_numero, m.referencia, cn.anio, cn.mes
        from cuentas_por_pagar.pagos p
        join bancos.movimientos m on m.id = p.movimiento_id
        join bancos.conciliaciones cn on cn.id = m.conciliacion_id and cn.estado = 'autorizada'
       where p.empresa_id = ${empresaId}::uuid and p.forma in ('cheque', 'cheque_de_apertura') ${delProveedor}
         and p.fecha > ${corte}::date
         and ${pagoCuentaAlCorte(corte)}
         and (p.creado_en at time zone 'America/Guatemala')::date <= ${corte}::date
         and make_date(cn.anio, cn.mes, 1) <= ${corte}::date
         and (make_date(cn.anio, cn.mes, 1) + interval '1 month' - interval '1 day')::date > ${corte}::date
         and (make_date(cn.anio, cn.mes, 1) + interval '1 month' - interval '1 day')::date < p.fecha
       order by cn.anio, cn.mes, p.numero`);
    return (rows as Fila[]).map((fila) => ({
      numeroDelPago: numeroDelPago(Number(fila.numero), Number(fila.anio_de_numero)),
      referencia: fila.referencia === null ? null : String(fila.referencia),
      anio: Number(fila.anio),
      mes: Number(fila.mes),
    }));
  }

  documentos(
    filtro: FiltroDeDocumentosAlCorte,
    pagina: PaginacionDeDocumentos | null,
  ): Promise<PaginaDeDocumentosAlCorte> {
    return documentosAlCorte(this.transaccion, filtro, pagina);
  }

  async datosDelProveedor(proveedorId: string): Promise<{ nombre: string; nit: string | null } | null> {
    const { rows } = await this.transaccion.execute(sql`
      select t.nombre_mostrar as nombre, t.nit
        from terceros.proveedores p join terceros.terceros t on t.id = p.tercero_id
       where p.id = ${proveedorId}::uuid`);
    const [fila] = rows as Fila[];
    return fila ? { nombre: String(fila.nombre), nit: fila.nit === null ? null : String(fila.nit) } : null;
  }

  movimientosDelProveedor(rango: RangoDelEstado): Promise<MovimientoDelProveedor[]> {
    return movimientosDelProveedor(this.transaccion, rango);
  }

  retencionesDelProveedor(empresaId: string, proveedorId: string): Promise<RetencionDelDocumento[]> {
    return retencionesDelProveedor(this.transaccion, empresaId, proveedorId);
  }

  notasConSaldoAlCorte(filtro: FiltroDeSaldosAFavor): Promise<NotaAlCorte[]> {
    return notasConSaldoAlCorte(this.transaccion, filtro);
  }

  contrasenasPorPagar(filtro: FiltroDeContrasenasPorPagar): Promise<ContrasenaPorPagar[]> {
    return contrasenasPorPagar(this.transaccion, filtro);
  }
}
