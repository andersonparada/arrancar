import { and, asc, eq, gte, ilike, inArray, lt, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { ConsultasDePagos, PagoDelMes, ProveedoresPorPagar } from '../../aplicacion/puertos/puertos-de-pagos.js';
import { numeroDeContrasena } from '../../dominio/contrasena.js';
import { aplicacionesDePagos } from './aplicaciones-de-pagos.tablas.js';
import { ConsultaBaseDeDocumentos } from './consulta-base-de-documentos.js';
import { contrasenaDocumentos } from './contrasena-documentos.tablas.js';
import { contrasenas } from './contrasenas.tablas.js';
import { documentos } from './documentos.tablas.js';
import { pagos } from './pagos.tablas.js';

const FORMAS_DEL_MES = ['cheque', 'nota_de_debito', 'nota_ligada', 'efectivo'] as const;

/** Primer día del mes de la fecha y primer día del siguiente (`AAAA-MM-DD`). */
function limitesDelMes(fecha: string): { desde: string; hasta: string } {
  const anio = Number(fecha.slice(0, 4));
  const mes = Number(fecha.slice(5, 7));
  const siguiente = mes === 12 ? `${anio + 1}-01-01` : `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
  return { desde: `${fecha.slice(0, 7)}-01`, hasta: siguiente };
}

/** Lecturas de pagos con seguridad por empresa (RLS). */
export class ConsultasDePagosDrizzle implements ConsultasDePagos {
  async pagosDelMes(proveedorId: string, fecha: string): Promise<PagoDelMes[]> {
    const { desde, hasta } = limitesDelMes(fecha);
    const filas = await transaccionEnCurso()
      .select()
      .from(pagos)
      .where(
        and(
          eq(pagos.proveedorId, proveedorId),
          eq(pagos.estado, 'vigente'),
          inArray(pagos.forma, [...FORMAS_DEL_MES]),
          gte(pagos.fecha, desde),
          lt(pagos.fecha, hasta),
        ),
      );
    const cargos = await this.cargosDeEfectivo(filas.filter(({ forma }) => forma === 'efectivo').map(({ id }) => id));
    return filas.map((fila) => ({
      numero: fila.numero,
      anioDeNumero: fila.anioDeNumero,
      forma: fila.forma as PagoDelMes['forma'],
      montoCentavos: aCentavos(fila.monto),
      cargoIds: cargos.get(fila.id) ?? [],
    }));
  }

  private async cargosDeEfectivo(pagoIds: string[]): Promise<Map<string, string[]>> {
    const porPago = new Map<string, string[]>();
    if (pagoIds.length === 0) return porPago;
    const lineas = await transaccionEnCurso()
      .select({ pagoId: aplicacionesDePagos.pagoId, cargoId: aplicacionesDePagos.cargoId })
      .from(aplicacionesDePagos)
      .where(inArray(aplicacionesDePagos.pagoId, pagoIds));
    for (const { pagoId, cargoId } of lineas) porPago.set(pagoId, [...(porPago.get(pagoId) ?? []), cargoId]);
    return porPago;
  }

  async contrasenas(ids: readonly string[]): Promise<Map<string, { numero: string; fecha: string }>> {
    if (ids.length === 0) return new Map();
    const filas = await transaccionEnCurso()
      .select({
        id: contrasenas.id,
        numero: contrasenas.numero,
        anio: contrasenas.anioDeNumero,
        fecha: contrasenas.fecha,
      })
      .from(contrasenas)
      .where(inArray(contrasenas.id, [...ids]));
    return new Map(
      filas.map(({ id, numero, anio, fecha }) => [id, { numero: numeroDeContrasena(numero, anio), fecha }]),
    );
  }

  async proveedoresPorPagar(
    filtro: { buscar?: string; pagina: number; limite: number },
    hoy: string,
  ): Promise<ProveedoresPorPagar> {
    const filas = await this.proveedoresConSaldo(filtro, hoy);
    return {
      total: filas[0]?.total ?? 0,
      filas: filas.map((fila) => ({
        proveedorId: fila.proveedorId,
        nombre: fila.nombre,
        nit: fila.nit,
        porPagarCentavos: aCentavos(fila.porPagar),
        disponibleCentavos: aCentavos(fila.disponible),
        contrasenas: fila.contrasenas,
      })),
    };
  }

  /** Los cargos autorizados con saldo dentro de una contraseña vigente, sumados por proveedor. */
  private proveedoresConSaldo(
    { buscar, pagina, limite }: { buscar?: string; pagina: number; limite: number },
    hoy: string,
  ) {
    const base = new ConsultaBaseDeDocumentos(hoy);
    const disponible = base.disponibleDelCargo();
    const autorizados = condicionDeProveedoresPorPagar(buscar);
    return transaccionEnCurso()
      .select(columnasDeProveedor({ deuda: base.deudaDelCargo(), disponible }))
      .from(documentos)
      .innerJoin(contrasenaDocumentos, enContrasenaVigente)
      .innerJoin(proveedores, eq(proveedores.id, documentos.proveedorId))
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .leftJoin(base.alCargo, eq(base.alCargo.cargoId, documentos.id))
      .leftJoin(base.pagadoAlCargo, eq(base.pagadoAlCargo.cargoId, documentos.id))
      .leftJoin(base.ajustadoDeLaNota, eq(base.ajustadoDeLaNota.notaId, documentos.id))
      .where(autorizados)
      .groupBy(proveedores.id, terceros.nombreMostrar, terceros.nit)
      .having(sql`bool_or(${disponible} > 0)`)
      .orderBy(asc(terceros.nombreMostrar), asc(proveedores.id))
      .limit(limite)
      .offset((pagina - 1) * limite);
  }
}

const enContrasenaVigente = and(
  eq(contrasenaDocumentos.documentoId, documentos.id),
  eq(contrasenaDocumentos.vigente, true),
);

/** Cargos autorizados, de los proveedores que se buscan por nombre (todos si no se busca). */
const condicionDeProveedoresPorPagar = (buscar: string | undefined) =>
  and(
    eq(documentos.estado, 'autorizado'),
    sql`${documentos.tipo} <> 'nota_de_credito'`,
    buscar ? ilike(terceros.nombreMostrar, `%${buscar}%`) : undefined,
  );

const columnasDeProveedor = ({ deuda, disponible }: { deuda: SQL; disponible: SQL }) => ({
  proveedorId: proveedores.id,
  nombre: terceros.nombreMostrar,
  nit: terceros.nit,
  porPagar: sql<string>`sum(${deuda})`,
  disponible: sql<string>`sum(${disponible}) filter (where ${disponible} > 0)`,
  contrasenas: sql<number>`count(distinct ${contrasenaDocumentos.contrasenaId})`.mapWith(Number),
  total: sql<number>`count(*) over ()`.mapWith(Number),
});
