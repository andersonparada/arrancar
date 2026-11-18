import { sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ConsultasDeNotasSinAplicar,
  FiltroDeNotasSinAplicar,
  NotaSinAplicar,
} from '../../aplicacion/puertos/puertos-de-notas-sin-aplicar.js';

type Fila = Record<string, string | number | boolean | null>;

const textoONulo = (valor: unknown): string | null => (valor === null || valor === undefined ? null : String(valor));

function aNota(fila: Fila): NotaSinAplicar {
  return {
    movimientoId: String(fila.movimiento_id),
    cuentaBancariaId: String(fila.cuenta_bancaria_id),
    cuenta: String(fila.cuenta),
    fecha: String(fila.fecha),
    numero: fila.numero === null ? null : Number(fila.numero),
    referencia: textoONulo(fila.referencia),
    montoCentavos: aCentavos(String(fila.monto)),
    aplicadoCentavos: aCentavos(String(fila.aplicado)),
    conciliada: fila.conciliada === true,
  };
}

/** La nota con lo que le aplicaron hasta el corte los pagos `nota_ligada` vigentes entonces. */
const aplicadoAlCorte = (empresaId: string, corte: string): SQL => sql`coalesce((
  select sum(p.monto) from cuentas_por_pagar.pagos p
   where p.empresa_id = ${empresaId}::uuid and p.movimiento_id = m.id and p.forma = 'nota_ligada'
     and p.fecha <= ${corte}::date and (p.fecha_de_anulacion is null or p.fecha_de_anulacion > ${corte}::date)), 0)`;

/** Una nota de débito suelta, marcada con el concepto de sistema, con fecha hasta el corte y no anulada al corte. */
const marcadaAlCorte = (empresaId: string, corte: string): SQL => sql`
  m.empresa_id = ${empresaId}::uuid and m.tipo = 'debito' and not m.saldo_inicial
  and m.transferencia_id is null and m.revierte_a_id is null and m.modulo_de_origen is null
  and m.fecha <= ${corte}::date and m.anulado_en is null
  and not exists (select 1 from bancos.movimientos i where i.revierte_a_id = m.id and i.fecha <= ${corte}::date)
  and exists (select 1 from bancos.conceptos c where c.id = m.concepto_id and c.clave_de_sistema = 'pago_a_proveedor')`;

/**
 * R11 y la conciliación de R1: las notas de débito de Bancos marcadas con el concepto de sistema `pago_a_proveedor` (sueltas,
 * sin origen, que no son saldo inicial ni inverso), con fecha hasta el corte y no anuladas al corte, menos lo que aplicaron
 * hasta el corte los pagos `nota_ligada` vigentes entonces. Una nota anulada sin inverso «nunca existió»; una con inverso
 * deja de contar desde la fecha de ese inverso.
 */
export class NotasSinAplicarDrizzle implements ConsultasDeNotasSinAplicar {
  async notasSinAplicar({ empresaId, corte, cuentaBancariaId }: FiltroDeNotasSinAplicar): Promise<NotaSinAplicar[]> {
    const dela = cuentaBancariaId ? sql`and m.cuenta_bancaria_id = ${cuentaBancariaId}::uuid` : sql``;
    const { rows } = await transaccionEnCurso().execute(sql`
      select n.movimiento_id, n.cuenta_bancaria_id, n.cuenta, n.fecha, n.numero, n.referencia, n.monto::text as monto,
             n.aplicado::text as aplicado, n.conciliada
        from (
          select m.id::text as movimiento_id, m.cuenta_bancaria_id::text as cuenta_bancaria_id, cb.nombre as cuenta,
                 m.fecha::text as fecha, m.numero, m.referencia, m.monto, m.conciliacion_id is not null as conciliada,
                 ${aplicadoAlCorte(empresaId, corte)} as aplicado
            from bancos.movimientos m
            join bancos.cuentas_bancarias cb on cb.id = m.cuenta_bancaria_id
           where ${marcadaAlCorte(empresaId, corte)} ${dela}) n
       where n.monto > n.aplicado
       order by n.fecha, n.numero, n.movimiento_id`);
    return (rows as Fila[]).map(aNota);
  }
}
