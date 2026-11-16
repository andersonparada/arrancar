import { sql, type SQL } from 'drizzle-orm';
import type { Transaccion } from '../../../core/base-datos/conexion.js';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { FiltroDeSaldosAFavor } from '../../aplicacion/puertos/puertos-de-reportes-de-proveedor.js';
import type { NotaAlCorte } from '../../dominio/saldos-a-favor.js';
import { parametrosDe, saldosAlCorte } from './saldos-al-corte.sql.js';

type Fila = Record<string, string | number | boolean | null>;

const centavosDe = (valor: unknown): number => aCentavos(String(valor ?? '0'));

/**
 * La fecha de cada movimiento vigente al corte de una nota: aplicaciones, ajustes y reintegros (un pago parcial o un
 * reconocimiento interrumpe la prescripción, Código Civil arts. 1506 y 1507).
 */
function movimientosDeLasNotas({ empresaId, corte }: FiltroDeSaldosAFavor): SQL {
  return sql`movimientos_de_notas as (
    select nota_id as id, max(fecha) as fecha from cuentas_por_pagar.aplicaciones_de_notas
     where empresa_id = ${empresaId}::uuid and fecha <= ${corte}::date group by nota_id
    union all
    select documento_id, max(fecha) from cuentas_por_pagar.ajustes_de_saldo
     where empresa_id = ${empresaId}::uuid and fecha <= ${corte}::date
       and (estado = 'vigente' or (anulado_en at time zone 'America/Guatemala')::date > ${corte}::date)
     group by documento_id
    union all
    select ar.nota_id, max(r.fecha)
      from cuentas_por_pagar.aplicaciones_de_reintegros ar
      join cuentas_por_pagar.reintegros r on r.id = ar.reintegro_id and r.empresa_id = ${empresaId}::uuid
     where ar.empresa_id = ${empresaId}::uuid and r.fecha <= ${corte}::date
       and (r.estado = 'vigente' or r.fecha_de_anulacion > ${corte}::date)
     group by ar.nota_id),
  ultimos as (select id, max(fecha) as fecha from movimientos_de_notas group by id)`;
}

const aNotaAlCorte = (fila: Fila): NotaAlCorte => ({
  id: String(fila.id),
  proveedorId: String(fila.proveedor_id),
  proveedorNombre: String(fila.proveedor_nombre),
  proveedorNit: fila.proveedor_nit === null ? null : String(fila.proveedor_nit),
  serie: fila.serie === null ? null : String(fila.serie),
  numero: String(fila.numero),
  fechaEmision: String(fila.fecha_emision),
  baseCentavos: centavosDe(fila.base),
  aplicadoCentavos: centavosDe(fila.aplicado),
  ajustadoCentavos: centavosDe(fila.ajustado),
  reintegradoCentavos: centavosDe(fila.reintegrado),
  saldoCentavos: centavosDe(fila.saldo),
  ultimoMovimiento: String(fila.ultimo_movimiento),
  enContrasena: fila.en_contrasena === true,
});

/** Las notas de crédito vigentes al corte con saldo libre (o todas, con `incluirSinSaldo`), con su último movimiento. */
export async function notasConSaldoAlCorte(
  transaccion: Transaccion,
  filtro: FiltroDeSaldosAFavor,
): Promise<NotaAlCorte[]> {
  const conSaldo = filtro.incluirSinSaldo ? sql`true` : sql`s.saldo > 0`;
  const { rows } = await transaccion.execute(sql`
    with ${saldosAlCorte(parametrosDe(filtro))}, ${movimientosDeLasNotas(filtro)}
    select s.id::text as id, s.proveedor_id::text as proveedor_id, t.nombre_mostrar as proveedor_nombre,
           t.nit as proveedor_nit, s.serie, s.numero, s.fecha_emision::text as fecha_emision, s.base::text as base,
           s.aplicado::text as aplicado, s.ajustado::text as ajustado, s.reintegrado::text as reintegrado,
           s.saldo::text as saldo, greatest(s.fecha_emision, coalesce(u.fecha, s.fecha_emision))::text as ultimo_movimiento,
           exists (select 1 from cuentas_por_pagar.contrasena_documentos cd where cd.documento_id = s.id and cd.vigente) as en_contrasena
      from saldos s
      join terceros.proveedores p on p.id = s.proveedor_id
      join terceros.terceros t on t.id = p.tercero_id
      left join ultimos u on u.id = s.id
     where s.es_nota and ${conSaldo}
     order by ultimo_movimiento, t.nombre_mostrar, s.numero`);
  return (rows as Fila[]).map(aNotaAlCorte);
}
