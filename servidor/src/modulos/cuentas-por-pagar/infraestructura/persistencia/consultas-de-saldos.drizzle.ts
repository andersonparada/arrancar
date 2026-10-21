import { and, asc, eq, ne, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { documentos as documentosDeCompra } from '../../../libro-de-compras/infraestructura/persistencia/documentos.tablas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type {
  ConsultasDeSaldos,
  NotaConSaldoLibre,
  TotalesDelProveedor,
} from '../../aplicacion/puertos/puertos-de-consultas.js';
import { ConsultaBaseDeDocumentos } from './consulta-base-de-documentos.js';
import { documentos } from './documentos.tablas.js';

const esUnaNotaVigente = and(ne(documentos.estado, 'anulado'), eq(documentos.tipo, 'nota_de_credito'));

type SumasDeLosCargos = Omit<TotalesDelProveedor, 'proveedorNombre'>;

/** Las cuentas de un proveedor en la empresa activa; los saldos se calculan, no se guardan (RLS limita a la empresa). */
export class ConsultasDeSaldosDrizzle implements ConsultasDeSaldos {
  async totalesDelProveedor(proveedorId: string, hoy: string): Promise<TotalesDelProveedor | null> {
    const [proveedor] = await transaccionEnCurso()
      .select({ nombre: terceros.nombreMostrar })
      .from(proveedores)
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .where(eq(proveedores.id, proveedorId));
    if (!proveedor) return null;
    return { proveedorNombre: proveedor.nombre, ...(await this.sumasDeLosCargos(proveedorId, hoy)) };
  }

  /** Lo que falta por pagar de los cargos vigentes con saldo, y la parte ya vencida. */
  private async sumasDeLosCargos(proveedorId: string, hoy: string): Promise<SumasDeLosCargos> {
    const base = new ConsultaBaseDeDocumentos();
    const saldo = base.saldoDelCargo();
    const [sumas] = await transaccionEnCurso()
      .select({
        porPagar: sql<string>`coalesce(sum(${saldo}), 0)`,
        vencido: sql<string>`coalesce(sum(${saldo}) filter (where ${documentos.vencimiento} < ${hoy}), 0)`,
        cargos: sql<number>`count(*)`.mapWith(Number),
      })
      .from(documentos)
      .leftJoin(base.alCargo, eq(base.alCargo.cargoId, documentos.id))
      .where(
        and(
          eq(documentos.proveedorId, proveedorId),
          ne(documentos.estado, 'anulado'),
          ne(documentos.tipo, 'nota_de_credito'),
          sql`${saldo} > 0`,
        ),
      );
    return {
      porPagarCentavos: aCentavos(sumas!.porPagar),
      vencidoCentavos: aCentavos(sumas!.vencido),
      cargosConSaldo: sumas!.cargos,
    };
  }

  async notasConSaldoLibre(proveedorId: string): Promise<NotaConSaldoLibre[]> {
    const { porLaNota } = new ConsultaBaseDeDocumentos();
    const filas = await transaccionEnCurso()
      .select({
        id: documentos.id,
        documentoId: documentos.documentoId,
        serie: documentosDeCompra.serie,
        numero: documentosDeCompra.numero,
        fechaEmision: documentos.fechaEmision,
        total: documentos.total,
        aplicado: porLaNota.monto,
      })
      .from(documentos)
      .innerJoin(documentosDeCompra, eq(documentosDeCompra.id, documentos.documentoId))
      .leftJoin(porLaNota, eq(porLaNota.notaId, documentos.id))
      .where(
        and(
          eq(documentos.proveedorId, proveedorId),
          esUnaNotaVigente,
          sql`${documentos.total} - coalesce(${porLaNota.monto}, 0) > 0`,
        ),
      )
      .orderBy(asc(documentos.fechaEmision), asc(documentos.creadoEn));
    return filas.map(aNotaConSaldoLibre);
  }
}

function aNotaConSaldoLibre({
  total,
  aplicado,
  ...nota
}: Omit<NotaConSaldoLibre, 'saldoLibreCentavos'> & { total: string; aplicado: string | null }): NotaConSaldoLibre {
  return { ...nota, saldoLibreCentavos: aCentavos(total) - aCentavos(aplicado ?? '0') };
}
