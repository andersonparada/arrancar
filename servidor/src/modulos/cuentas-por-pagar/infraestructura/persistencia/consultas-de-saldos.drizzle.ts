import { and, asc, eq, exists, ne, sql } from 'drizzle-orm';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { ProveedorConDocumentosDto } from '../../aplicacion/dto/documento-por-pagar.dto.js';
import type {
  ConsultasDeSaldos,
  NotaConSaldoLibre,
  TotalesDelProveedor,
} from '../../aplicacion/puertos/puertos-de-consultas.js';
import { chequesDeAperturaSinLigarDelProveedor } from './cheques-de-apertura-sin-ligar.drizzle.js';
import { ConsultaBaseDeDocumentos } from './consulta-base-de-documentos.js';
import { documentos } from './documentos.tablas.js';
import { posfechadosDelProveedor } from './posfechados-del-proveedor.drizzle.js';

const esUnaNotaVigente = and(ne(documentos.estado, 'anulado'), eq(documentos.tipo, 'nota_de_credito'));

/** Los cargos vigentes del proveedor (todo lo que no es nota de crédito ni está anulado). */
const esUnCargoVigenteDe = (proveedorId: string) =>
  and(
    eq(documentos.proveedorId, proveedorId),
    ne(documentos.estado, 'anulado'),
    ne(documentos.tipo, 'nota_de_credito'),
  );

/** Cuántos cheques posfechados se listan en la ficha del proveedor. */
const LIMITE_DE_POSFECHADOS = 10;

type SumasDeLosCargos = Omit<TotalesDelProveedor, 'proveedorNombre' | 'chequesDeAperturaSinLigar'>;

/** Las sumas de la deuda de un proveedor: total, vencida y comprometida con posfechados, y cuántos cargos. */
function columnasDeSumas(base: ConsultaBaseDeDocumentos, hoy: string) {
  const deuda = base.deudaDelCargo();
  const comprometido = sql`coalesce(${base.pagadoAlCargo.comprometido}, 0)`;
  const vence = sql`${documentos.vencimiento} < ${hoy}`;
  return {
    porPagar: sql<string>`coalesce(sum(${deuda}), 0)`,
    vencido: sql<string>`coalesce(sum(${deuda}) filter (where ${vence}), 0)`,
    comprometido: sql<string>`coalesce(sum(${comprometido}), 0)`,
    vencidoComprometido: sql<string>`coalesce(sum(${comprometido}) filter (where ${vence}), 0)`,
    cargos: sql<number>`count(*)`.mapWith(Number),
  };
}

/** Las cuentas de un proveedor en la empresa activa; los saldos se calculan, no se guardan (RLS limita a la empresa). */
export class ConsultasDeSaldosDrizzle implements ConsultasDeSaldos {
  async totalesDelProveedor(proveedorId: string, hoy: string): Promise<TotalesDelProveedor | null> {
    const [proveedor] = await transaccionEnCurso()
      .select({ nombre: terceros.nombreMostrar })
      .from(proveedores)
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .where(eq(proveedores.id, proveedorId));
    if (!proveedor) return null;
    return {
      proveedorNombre: proveedor.nombre,
      ...(await this.sumasDeLosCargos(proveedorId, hoy)),
      chequesDeAperturaSinLigar: await chequesDeAperturaSinLigarDelProveedor(proveedorId, hoy),
    };
  }

  /** Lo que se debe de los cargos vigentes con deuda, la parte ya vencida y la comprometida con posfechados. */
  private async sumasDeLosCargos(proveedorId: string, hoy: string): Promise<SumasDeLosCargos> {
    const base = new ConsultaBaseDeDocumentos(hoy);
    const [sumas] = await transaccionEnCurso()
      .select(columnasDeSumas(base, hoy))
      .from(documentos)
      .leftJoin(base.alCargo, eq(base.alCargo.cargoId, documentos.id))
      .leftJoin(base.pagadoAlCargo, eq(base.pagadoAlCargo.cargoId, documentos.id))
      .leftJoin(base.ajustadoDeLaNota, eq(base.ajustadoDeLaNota.notaId, documentos.id))
      .where(and(esUnCargoVigenteDe(proveedorId), sql`${base.deudaDelCargo()} > 0`));
    return {
      porPagarCentavos: aCentavos(sumas!.porPagar),
      vencidoCentavos: aCentavos(sumas!.vencido),
      comprometidoCentavos: aCentavos(sumas!.comprometido),
      vencidoComprometidoCentavos: aCentavos(sumas!.vencidoComprometido),
      cargosConSaldo: sumas!.cargos,
      posfechados: await posfechadosDelProveedor(proveedorId, hoy, LIMITE_DE_POSFECHADOS),
    };
  }

  async proveedoresConDocumentos(): Promise<ProveedorConDocumentosDto[]> {
    return transaccionEnCurso()
      .select({ id: proveedores.id, nombre: terceros.nombreMostrar, activo: proveedores.activo })
      .from(proveedores)
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .where(exists(transaccionEnCurso().select().from(documentos).where(eq(documentos.proveedorId, proveedores.id))))
      .orderBy(asc(terceros.nombreMostrar));
  }

  async notasConSaldoLibre(proveedorId: string): Promise<NotaConSaldoLibre[]> {
    const base = new ConsultaBaseDeDocumentos();
    const { porLaNota, ajustadoDeLaNota, reintegradoDeLaNota } = base;
    const filas = await transaccionEnCurso()
      .select({
        id: documentos.id,
        documentoId: documentos.documentoId,
        serie: documentos.serie,
        numero: documentos.numero,
        fechaEmision: documentos.fechaEmision,
        total: documentos.total,
        saldoAlInicio: documentos.saldoAlInicio,
        aplicado: porLaNota.monto,
        ajustado: ajustadoDeLaNota.monto,
        reintegrado: reintegradoDeLaNota.monto,
      })
      .from(documentos)
      .leftJoin(porLaNota, eq(porLaNota.notaId, documentos.id))
      .leftJoin(ajustadoDeLaNota, eq(ajustadoDeLaNota.notaId, documentos.id))
      .leftJoin(reintegradoDeLaNota, eq(reintegradoDeLaNota.notaId, documentos.id))
      .where(and(eq(documentos.proveedorId, proveedorId), esUnaNotaVigente, sql`${base.saldoLibreDeLaNota()} > 0`))
      .orderBy(asc(documentos.fechaEmision), asc(documentos.creadoEn));
    return filas.map(aNotaConSaldoLibre);
  }
}

function aNotaConSaldoLibre({
  total,
  saldoAlInicio,
  aplicado,
  ajustado,
  reintegrado,
  ...nota
}: Omit<NotaConSaldoLibre, 'saldoLibreCentavos'> & {
  total: string;
  saldoAlInicio: string | null;
  aplicado: string | null;
  ajustado: string | null;
  reintegrado: string | null;
}): NotaConSaldoLibre {
  const rebajado = [aplicado, ajustado, reintegrado].reduce((suma, monto) => suma + aCentavos(monto ?? '0'), 0);
  const saldoLibreCentavos = aCentavos(saldoAlInicio ?? total) - rebajado;
  return { ...nota, saldoLibreCentavos };
}
