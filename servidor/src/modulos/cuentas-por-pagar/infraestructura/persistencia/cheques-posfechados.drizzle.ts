import { sql } from 'drizzle-orm';
import type { Transaccion } from '../../../core/base-datos/conexion.js';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type {
  ChequePosfechado,
  FiltroDeChequesPosfechados,
} from '../../aplicacion/puertos/puertos-de-reportes-de-pagos.js';
import { numeroDelPago } from '../../dominio/pagos.js';
import { FIN_DE_MES_COBRADO } from './saldos-al-corte.sql.js';

type Fila = Record<string, string | number | boolean | null>;

const textoONulo = (valor: unknown): string | null => (valor === null || valor === undefined ? null : String(valor));

function aCheque(fila: Fila): ChequePosfechado {
  return {
    pagoId: String(fila.pago_id),
    numeroDelPago: numeroDelPago(Number(fila.numero), Number(fila.anio_de_numero)),
    fecha: String(fila.fecha),
    cuentaBancariaId: textoONulo(fila.cuenta_bancaria_id),
    cuenta: textoONulo(fila.cuenta),
    numeroDeCheque: textoONulo(fila.numero_de_cheque),
    proveedorId: String(fila.proveedor_id),
    proveedorNombre: String(fila.proveedor_nombre),
    montoCentavos: aCentavos(String(fila.monto)),
    cobrado: fila.cobrado === true,
    cobradoEn: fila.cobrado_anio === null ? null : { anio: Number(fila.cobrado_anio), mes: Number(fila.cobrado_mes) },
  };
}

const SELECCION_DE_CHEQUES = sql`
    select p.id::text as pago_id, p.numero, p.anio_de_numero, p.fecha::text as fecha,
           m.cuenta_bancaria_id::text as cuenta_bancaria_id, cb.nombre as cuenta, m.referencia as numero_de_cheque,
           p.proveedor_id::text as proveedor_id, t.nombre_mostrar as proveedor_nombre, p.monto::text as monto,
           m.conciliacion_id is not null as cobrado,
           case when ${FIN_DE_MES_COBRADO} < p.fecha then cn.anio end as cobrado_anio,
           case when ${FIN_DE_MES_COBRADO} < p.fecha then cn.mes end as cobrado_mes
      from cuentas_por_pagar.pagos p
      join terceros.proveedores pr on pr.id = p.proveedor_id
      join terceros.terceros t on t.id = pr.tercero_id
      left join bancos.movimientos m on m.id = p.movimiento_id
      left join bancos.cuentas_bancarias cb on cb.id = m.cuenta_bancaria_id
      left join bancos.conciliaciones cn on cn.id = m.conciliacion_id and cn.estado = 'autorizada'`;

/**
 * R7: los cheques vigentes al corte, entregados hasta el corte y con fecha posterior. Si Bancos los marcó cobrados en una
 * conciliación autorizada que termina hasta el corte, ya rebajaron el pasivo (misma fecha de efecto de R1) y no salen.
 */
export async function chequesPosfechados(
  transaccion: Transaccion,
  { empresaId, corte, proveedorId, cuentaBancariaId }: FiltroDeChequesPosfechados,
): Promise<ChequePosfechado[]> {
  const delProveedor = proveedorId ? sql`and p.proveedor_id = ${proveedorId}::uuid` : sql``;
  const delaCuenta = cuentaBancariaId ? sql`and m.cuenta_bancaria_id = ${cuentaBancariaId}::uuid` : sql``;
  const { rows } = await transaccion.execute(sql`${SELECCION_DE_CHEQUES}
     where p.empresa_id = ${empresaId}::uuid and p.forma = 'cheque' and p.fecha > ${corte}::date
       and (p.estado = 'vigente' or p.fecha_de_anulacion > ${corte}::date)
       and (p.creado_en at time zone 'America/Guatemala')::date <= ${corte}::date
       and least(p.fecha, coalesce(${FIN_DE_MES_COBRADO}, p.fecha)) > ${corte}::date
       ${delProveedor} ${delaCuenta}
     order by p.fecha, p.anio_de_numero, p.numero`);
  return (rows as Fila[]).map(aCheque);
}
