import { sql, type SQL } from 'drizzle-orm';
import type { Transaccion } from '../../../core/base-datos/conexion.js';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  CargoDeBancarizacion,
  ConsultasDeBancarizacion,
  DocumentoSobreElUmbral,
  FiltroDeBancarizacion,
  PagoDeUnDocumento,
  PagoEnEfectivoDelRango,
} from '../../aplicacion/puertos/puertos-de-bancarizacion-del-reporte.js';
import type { FormaDePago } from '../../dominio/pagos.js';
import { numeroDelPago } from '../../dominio/pagos.js';
import { numeroDelRetiro } from '../../dominio/retiros.js';

type Fila = Record<string, string | number | boolean | null>;

const textoONulo = (valor: unknown): string | null => (valor === null || valor === undefined ? null : String(valor));
const centavosONulo = (valor: unknown): number | null => (valor === null ? null : aCentavos(String(valor)));

/** Los datos de un cargo y de su documento del libro (nulos en un saldo inicial). */
const COLUMNAS_DEL_CARGO = sql`d.id::text as cargo_id, d.proveedor_id::text as cargo_proveedor_id, d.serie, d.numero as cargo_numero,
       d.origen = 'saldo_inicial' as es_saldo_inicial, coalesce(d.saldo_al_inicio, d.total)::text as cargo_total,
       ld.iva::text as iva, (ld.iva - ld.iva_no_acreditable)::text as iva_acreditable`;

const UNIONES_DEL_CARGO = sql`join cuentas_por_pagar.documentos d on d.id = ap.cargo_id
      left join libro_de_compras.documentos ld on ld.id = d.documento_id`;

function aCargo(fila: Fila): CargoDeBancarizacion {
  const serie = textoONulo(fila.serie);
  return {
    documentoId: String(fila.cargo_id),
    etiqueta: serie ? `${serie}-${fila.cargo_numero}` : String(fila.cargo_numero),
    proveedorId: String(fila.cargo_proveedor_id),
    totalCentavos: aCentavos(String(fila.cargo_total)),
    ivaCentavos: centavosONulo(fila.iva),
    ivaAcreditableCentavos: centavosONulo(fila.iva_acreditable),
    esSaldoInicial: fila.es_saldo_inicial === true,
  };
}

const delProveedor = (proveedorId: string | undefined): SQL =>
  proveedorId ? sql`and p.proveedor_id = ${proveedorId}::uuid` : sql``;

/** Los pagos en efectivo vigentes con fecha en los meses pedidos, con el retiro de donde salió el efectivo. */
async function pagosDeEfectivo(transaccion: Transaccion, f: FiltroDeBancarizacion): Promise<Fila[]> {
  const { rows } = await transaccion.execute(sql`
    select p.id::text as pago_id, p.numero, p.anio_de_numero, p.fecha::text as fecha, p.proveedor_id::text as proveedor_id,
           t.nombre_mostrar as proveedor_nombre, r.numero as retiro_numero, r.anio_de_numero as retiro_anio,
           p.monto::text as monto, p.motivo_sin_bancarizar
      from cuentas_por_pagar.pagos p
      join terceros.proveedores pr on pr.id = p.proveedor_id
      join terceros.terceros t on t.id = pr.tercero_id
      left join cuentas_por_pagar.retiros_de_efectivo r on r.id = p.retiro_id
     where p.empresa_id = ${f.empresaId}::uuid and p.forma = 'efectivo' and p.estado = 'vigente'
       and p.fecha between ${f.desde}::date and ${f.hasta}::date ${delProveedor(f.proveedorId)}
     order by p.fecha, p.anio_de_numero, p.numero`);
  return rows as Fila[];
}

/** Los cargos que cubre cada uno de esos pagos, por id del pago. */
async function cargosDeEfectivo(transaccion: Transaccion, f: FiltroDeBancarizacion) {
  const { rows } = await transaccion.execute(sql`
    select ap.pago_id::text as pago_id, ${COLUMNAS_DEL_CARGO}
      from cuentas_por_pagar.aplicaciones_de_pagos ap
      join cuentas_por_pagar.pagos p on p.id = ap.pago_id
      ${UNIONES_DEL_CARGO}
     where ap.empresa_id = ${f.empresaId}::uuid and ap.vigente and p.empresa_id = ${f.empresaId}::uuid
       and p.forma = 'efectivo' and p.estado = 'vigente'
       and p.fecha between ${f.desde}::date and ${f.hasta}::date ${delProveedor(f.proveedorId)}
     order by d.fecha_emision, d.id`);
  const porPago = new Map<string, CargoDeBancarizacion[]>();
  for (const fila of rows as Fila[]) {
    const id = String(fila.pago_id);
    porPago.set(id, [...(porPago.get(id) ?? []), aCargo(fila)]);
  }
  return porPago;
}

function aPagoEnEfectivo(fila: Fila, cargos: CargoDeBancarizacion[]): PagoEnEfectivoDelRango {
  return {
    pagoId: String(fila.pago_id),
    recibo: numeroDelPago(Number(fila.numero), Number(fila.anio_de_numero)),
    fecha: String(fila.fecha),
    proveedorId: String(fila.proveedor_id),
    proveedorNombre: String(fila.proveedor_nombre),
    retiro: fila.retiro_numero === null ? null : numeroDelRetiro(Number(fila.retiro_numero), Number(fila.retiro_anio)),
    montoCentavos: aCentavos(String(fila.monto)),
    motivoSinBancarizar: textoONulo(fila.motivo_sin_bancarizar),
    cargos,
  };
}

function aPagoDeUnDocumento(fila: Fila): PagoDeUnDocumento {
  return {
    pagoId: String(fila.pago_id),
    numero: numeroDelPago(Number(fila.numero), Number(fila.anio_de_numero)),
    forma: String(fila.forma) as FormaDePago,
    fecha: String(fila.fecha),
    montoCentavos: aCentavos(String(fila.linea)),
  };
}

/** Agrupa las líneas (documento y su pago) por documento, conservando el orden. */
function agruparPorDocumento(filas: Fila[]): DocumentoSobreElUmbral[] {
  const documentos = new Map<string, DocumentoSobreElUmbral>();
  for (const fila of filas) {
    const id = String(fila.cargo_id);
    const documento = documentos.get(id) ?? {
      cargo: aCargo(fila),
      proveedorNombre: String(fila.proveedor_nombre),
      pagos: [],
    };
    documento.pagos.push(aPagoDeUnDocumento(fila));
    documentos.set(id, documento);
  }
  return [...documentos.values()];
}

/**
 * Las lecturas de R9 (bancarización): los pagos en efectivo de los meses pedidos con sus cargos y los cargos de Q30,000 o
 * más (el umbral) pagados en parte en efectivo con todos sus pagos. Lee las tablas de Libro de compras solo para el IVA.
 */
export class BancarizacionDelReporteDrizzle implements ConsultasDeBancarizacion {
  async pagosEnEfectivo(filtro: FiltroDeBancarizacion): Promise<PagoEnEfectivoDelRango[]> {
    const transaccion = transaccionEnCurso();
    const pagos = await pagosDeEfectivo(transaccion, filtro);
    const cargos = await cargosDeEfectivo(transaccion, filtro);
    return pagos.map((fila) => aPagoEnEfectivo(fila, cargos.get(String(fila.pago_id)) ?? []));
  }

  async documentosSobreElUmbral(
    filtro: FiltroDeBancarizacion & { umbralCentavos: number },
  ): Promise<DocumentoSobreElUmbral[]> {
    const umbral = (filtro.umbralCentavos / 100).toFixed(2);
    const { rows } = await transaccionEnCurso().execute(sql`
      select ${COLUMNAS_DEL_CARGO}, t.nombre_mostrar as proveedor_nombre, p.id::text as pago_id, p.numero,
             p.anio_de_numero, p.forma, p.fecha::text as fecha, ap.monto::text as linea
        from cuentas_por_pagar.documentos d
        join cuentas_por_pagar.aplicaciones_de_pagos ap on ap.cargo_id = d.id and ap.vigente
        join cuentas_por_pagar.pagos p on p.id = ap.pago_id and p.estado = 'vigente'
        join terceros.proveedores pr on pr.id = d.proveedor_id
        join terceros.terceros t on t.id = pr.tercero_id
        left join libro_de_compras.documentos ld on ld.id = d.documento_id
       where d.empresa_id = ${filtro.empresaId}::uuid and d.tipo <> 'nota_de_credito' and d.estado <> 'anulado'
         and coalesce(d.saldo_al_inicio, d.total) >= ${umbral}::numeric
         ${filtro.proveedorId ? sql`and d.proveedor_id = ${filtro.proveedorId}::uuid` : sql``}
         and exists (select 1 from cuentas_por_pagar.aplicaciones_de_pagos a2
                       join cuentas_por_pagar.pagos p2 on p2.id = a2.pago_id
                      where a2.cargo_id = d.id and a2.vigente and p2.forma = 'efectivo' and p2.estado = 'vigente'
                        and p2.fecha between ${filtro.desde}::date and ${filtro.hasta}::date)
       order by t.nombre_mostrar, d.fecha_emision, d.id, p.fecha, p.anio_de_numero, p.numero`);
    return agruparPorDocumento(rows as Fila[]);
  }
}
