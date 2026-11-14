import { and, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  ClaveDeFacturaAnterior,
  FacturaAnteriorConNotas,
  NotaQueCitaLaFactura,
  NotasDeLaFacturaAnterior,
  RepositorioDeFacturasAnteriores,
} from '../../aplicacion/puertos/puertos-de-facturas-anteriores.js';
import { FacturaAnteriorRegistradaPorOtraPersona } from '../../dominio/errores-de-factura-anterior.js';
import type { FacturaAnterior } from '../../dominio/factura-anterior.js';
import { FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO } from '../../dominio/tipos-de-documento.js';
import { mapeadorDeFacturaAnterior } from './factura-anterior.mapeador.js';
import { documentos } from './documentos.tablas.js';
import { facturasAnteriores } from './facturas-anteriores.tablas.js';

/** Misma serie (la ausente cuenta como vacía) y mismo número. */
const mismaSerieYNumero = (clave: ClaveDeFacturaAnterior, serie: SQL, numero: SQL): SQL | undefined =>
  and(sql`coalesce(${serie}, '') = ${clave.serie ?? ''}`, sql`${numero} = ${clave.numero}`);

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDeFacturasAnterioresDrizzle implements RepositorioDeFacturasAnteriores {
  async buscar(clave: ClaveDeFacturaAnterior, bloquear: boolean): Promise<FacturaAnteriorConNotas | null> {
    const porFel = clave.autorizacionFel
      ? await this.filaPor(eq(facturasAnteriores.autorizacionFel, clave.autorizacionFel), bloquear)
      : null;
    const fila = porFel ?? (await this.filaPor(this.delProveedor(clave), bloquear));
    if (!fila) return null;
    return { ...mapeadorDeFacturaAnterior.aDominio(fila), notas: await this.notasDe(fila.id) };
  }

  async buscarFacturaDelLibro(clave: ClaveDeFacturaAnterior): Promise<{ id: string } | null> {
    const delProveedor = and(
      eq(documentos.proveedorId, clave.proveedorId),
      mismaSerieYNumero(clave, sql`${documentos.serie}`, sql`${documentos.numero}`),
    );
    const deLaFel = clave.autorizacionFel ? eq(documentos.autorizacionFel, clave.autorizacionFel) : undefined;
    const [fila] = await transaccionEnCurso()
      .select({ id: documentos.id })
      .from(documentos)
      .where(
        and(
          eq(documentos.estado, 'vigente'),
          inArray(documentos.tipo, [...FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO]),
          or(delProveedor, deLaFel),
        ),
      )
      .limit(1);
    return fila ?? null;
  }

  async buscarNotaVigenteQueLaCita(clave: ClaveDeFacturaAnterior): Promise<NotaQueCitaLaFactura | null> {
    const deLaFel = clave.autorizacionFel ? eq(facturasAnteriores.autorizacionFel, clave.autorizacionFel) : undefined;
    const [nota] = await transaccionEnCurso()
      .select({ id: documentos.id, serie: documentos.serie, numero: documentos.numero })
      .from(documentos)
      .innerJoin(facturasAnteriores, eq(facturasAnteriores.id, documentos.facturaAnteriorId))
      .where(and(eq(documentos.estado, 'vigente'), or(this.delProveedor(clave), deLaFel)))
      .limit(1);
    return nota ?? null;
  }

  async agregar(empresaId: string, factura: FacturaAnterior): Promise<void> {
    const insertadas = await transaccionEnCurso()
      .insert(facturasAnteriores)
      .values({ id: factura.id, empresaId, ...mapeadorDeFacturaAnterior.aColumnas(factura) })
      .onConflictDoNothing()
      .returning({ id: facturasAnteriores.id });
    if (insertadas.length === 0) throw new FacturaAnteriorRegistradaPorOtraPersona();
  }

  async corregir(factura: FacturaAnterior): Promise<void> {
    await transaccionEnCurso()
      .update(facturasAnteriores)
      .set(mapeadorDeFacturaAnterior.aColumnas(factura))
      .where(eq(facturasAnteriores.id, factura.id));
  }

  private delProveedor(clave: ClaveDeFacturaAnterior): SQL | undefined {
    return and(
      eq(facturasAnteriores.proveedorId, clave.proveedorId),
      mismaSerieYNumero(clave, sql`${facturasAnteriores.serie}`, sql`${facturasAnteriores.numero}`),
    );
  }

  private async filaPor(condicion: SQL | undefined, bloquear: boolean) {
    const consulta = transaccionEnCurso().select().from(facturasAnteriores).where(condicion).limit(1);
    const [fila] = await (bloquear ? consulta.for('update') : consulta);
    return fila ?? null;
  }

  /** Lo que ya corrigieron las notas vigentes de la factura, por familia de nota. */
  private async notasDe(facturaId: string): Promise<NotasDeLaFacturaAnterior> {
    const deLaFamilia = (tipo: string, columna: typeof documentos.total | typeof documentos.iva) =>
      sql<string>`coalesce(sum(${columna}) filter (where ${documentos.tipo} = ${tipo}), 0)`;
    const [suma] = await transaccionEnCurso()
      .select({
        vigentes: sql<number>`count(*)::int`,
        totalDeCredito: deLaFamilia('nota_de_credito', documentos.total),
        ivaDeCredito: deLaFamilia('nota_de_credito', documentos.iva),
        totalDeDebito: deLaFamilia('nota_de_debito', documentos.total),
        ivaDeDebito: deLaFamilia('nota_de_debito', documentos.iva),
      })
      .from(documentos)
      .where(and(eq(documentos.facturaAnteriorId, facturaId), eq(documentos.estado, 'vigente')));
    const fila = suma ?? { vigentes: 0, totalDeCredito: '0', ivaDeCredito: '0', totalDeDebito: '0', ivaDeDebito: '0' };
    return {
      vigentes: fila.vigentes,
      totalDeNotasDeCredito: aCentavos(fila.totalDeCredito),
      ivaDeNotasDeCredito: aCentavos(fila.ivaDeCredito),
      totalDeNotasDeDebito: aCentavos(fila.totalDeDebito),
      ivaDeNotasDeDebito: aCentavos(fila.ivaDeDebito),
    };
  }
}
