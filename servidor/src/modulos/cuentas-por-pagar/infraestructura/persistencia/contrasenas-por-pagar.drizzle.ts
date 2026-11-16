import { sql } from 'drizzle-orm';
import type { Transaccion } from '../../../core/base-datos/conexion.js';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type {
  ContrasenaPorPagar,
  FiltroDeContrasenasPorPagar,
} from '../../aplicacion/puertos/puertos-de-reportes-de-proveedor.js';
import { numeroDeContrasena } from '../../dominio/contrasena.js';
import { saldosAlCorte } from './saldos-al-corte.sql.js';

type Fila = Record<string, string | number | boolean | null>;

const centavosDe = (valor: unknown): number => aCentavos(String(valor ?? '0'));

const aContrasenaPorPagar = (fila: Fila): ContrasenaPorPagar => ({
  id: String(fila.id),
  numero: numeroDeContrasena(Number(fila.numero), Number(fila.anio_de_numero)),
  proveedorId: String(fila.proveedor_id),
  proveedorNombre: String(fila.proveedor_nombre),
  fecha: String(fila.fecha),
  pagoPrometido: String(fila.pago_prometido),
  vence: fila.vence === null ? null : String(fila.vence),
  documentosConSaldo: Number(fila.documentos_con_saldo),
  saldoCentavos: centavosDe(fila.saldo),
  autorizadoCentavos: centavosDe(fila.autorizado),
  sinAutorizarCentavos: centavosDe(fila.sin_autorizar),
  comprometidoCentavos: centavosDe(fila.comprometido),
  impresa: fila.impresa === true,
});

/**
 * Las contraseñas vigentes con saldo cuyo pago prometido es hasta la fecha pedida (R5). El saldo es el de sus cargos hoy,
 * con el mismo cálculo que el resto de los reportes de saldos (`saldosAlCorte`, con corte hoy).
 */
export async function contrasenasPorPagar(
  transaccion: Transaccion,
  { empresaId, hoy, fechaDeInicio, proveedorId, pagoPrometidoHasta }: FiltroDeContrasenasPorPagar,
): Promise<ContrasenaPorPagar[]> {
  const { rows } = await transaccion.execute(sql`
    with ${saldosAlCorte({ empresaId, corte: hoy, fechaDeInicio, proveedorId })}
    select c.id::text as id, c.numero, c.anio_de_numero, c.proveedor_id::text as proveedor_id,
           t.nombre_mostrar as proveedor_nombre, c.fecha::text as fecha, c.fecha_de_pago::text as pago_prometido,
           (min(s.vencimiento) filter (where s.saldo > 0))::text as vence,
           count(*) filter (where s.saldo > 0)::int as documentos_con_saldo,
           coalesce(sum(s.saldo), 0)::text as saldo,
           coalesce(sum(s.saldo) filter (where s.autorizado), 0)::text as autorizado,
           coalesce(sum(s.saldo) filter (where not s.autorizado), 0)::text as sin_autorizar,
           coalesce(sum(s.comprometido), 0)::text as comprometido, c.impresa_en is not null as impresa
      from cuentas_por_pagar.contrasenas c
      join cuentas_por_pagar.contrasena_documentos cd on cd.contrasena_id = c.id and cd.vigente
      join saldos s on s.id = cd.documento_id and not s.es_nota
      join terceros.proveedores p on p.id = c.proveedor_id
      join terceros.terceros t on t.id = p.tercero_id
     where c.empresa_id = ${empresaId}::uuid and c.estado = 'vigente' and c.fecha_de_pago <= ${pagoPrometidoHasta}::date
     group by c.id, t.nombre_mostrar
    having coalesce(sum(s.saldo), 0) > 0
     order by c.fecha_de_pago, c.anio_de_numero, c.numero`);
  return (rows as Fila[]).map(aContrasenaPorPagar);
}
