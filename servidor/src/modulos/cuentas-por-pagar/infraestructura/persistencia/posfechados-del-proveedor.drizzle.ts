import { and, asc, eq, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { cheques } from '../../../bancos/infraestructura/persistencia/cheques.tablas.js';
import type { PosfechadoDelProveedor } from '../../aplicacion/puertos/puertos-de-consultas.js';
import { fechaDeEfectoDelPago, unionDeLaConciliacion } from './fecha-de-efecto-del-pago.sql.js';
import { conciliaciones } from '../../../bancos/infraestructura/persistencia/conciliaciones.tablas.js';
import { movimientos } from '../../../bancos/infraestructura/persistencia/movimientos.tablas.js';
import { aplicacionesDePagos } from './aplicaciones-de-pagos.tablas.js';
import { pagos } from './pagos.tablas.js';

type FilaDePosfechado = { numeroDeCheque: number | null; fecha: string; monto: string };

const sonPosfechadosDe = (proveedorId: string, hoy: string) =>
  and(
    eq(aplicacionesDePagos.proveedorId, proveedorId),
    eq(aplicacionesDePagos.vigente, true),
    sql`${fechaDeEfectoDelPago} > ${hoy}::date`,
  );

/**
 * Los pagos vigentes del proveedor con fecha posterior a `hoy` (cheques posfechados), del más próximo al más lejano, con
 * lo que cada uno entregó a sus cargos sumado. Hasta `limite`.
 */
export async function posfechadosDelProveedor(
  proveedorId: string,
  hoy: string,
  limite: number,
): Promise<PosfechadoDelProveedor[]> {
  const filas = await transaccionEnCurso()
    .select({
      numeroDeCheque: cheques.numero,
      fecha: pagos.fecha,
      monto: sql<string>`sum(${aplicacionesDePagos.monto})`,
    })
    .from(aplicacionesDePagos)
    .innerJoin(pagos, eq(pagos.id, aplicacionesDePagos.pagoId))
    .leftJoin(cheques, eq(cheques.movimientoId, pagos.movimientoId))
    .leftJoin(movimientos, eq(movimientos.id, pagos.movimientoId))
    .leftJoin(conciliaciones, unionDeLaConciliacion)
    .where(sonPosfechadosDe(proveedorId, hoy))
    .groupBy(pagos.id, pagos.fecha, pagos.numero, cheques.numero)
    .orderBy(asc(pagos.fecha), asc(pagos.numero))
    .limit(limite);
  return filas.map(aPosfechado);
}

const aPosfechado = ({ numeroDeCheque, fecha, monto }: FilaDePosfechado): PosfechadoDelProveedor => ({
  numeroDeCheque: numeroDeCheque === null ? null : String(numeroDeCheque),
  fecha,
  montoCentavos: aCentavos(monto),
});
