import { and, desc, eq, max } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  EmisionDelLibro,
  EmisionNueva,
  RepositorioDeEmisiones,
  RepositorioDeFoliacion,
} from '../../aplicacion/puertos/emisiones-del-libro.js';
import { emisionesDelLibro, foliacionDelLibro } from './folios-del-libro.tablas.js';

const LIMITE_DE_LA_LISTA = 200;

type Fila = typeof emisionesDelLibro.$inferSelect;

const aEmision = (fila: Fila): EmisionDelLibro => ({
  id: fila.id,
  periodo: fila.periodo,
  tipoDeLibro: fila.tipoDeLibro as EmisionDelLibro['tipoDeLibro'],
  folioDesde: fila.folioDesde,
  folioHasta: fila.folioHasta,
  paginas: fila.paginas,
  archivoId: fila.archivoId,
  huellaDeDatos: fila.huellaDeDatos,
  versionDePlantilla: fila.versionDePlantilla,
  totales: fila.totales,
  motivo: fila.motivo,
  creadoEn: fila.creadoEn,
});

/** La tabla solo se agrega y se lee: RLS rechaza cualquier cambio o borrado. */
export class RepositorioDeEmisionesDelLibroDrizzle implements RepositorioDeEmisiones {
  async agregar(empresaId: string, emision: EmisionNueva): Promise<EmisionDelLibro> {
    const [fila] = await transaccionEnCurso()
      .insert(emisionesDelLibro)
      .values({ ...emision, empresaId })
      .returning();
    return aEmision(fila!);
  }

  async buscar(id: string): Promise<EmisionDelLibro | null> {
    const [fila] = await transaccionEnCurso().select().from(emisionesDelLibro).where(eq(emisionesDelLibro.id, id));
    return fila ? aEmision(fila) : null;
  }

  async listar(periodo: string | null): Promise<EmisionDelLibro[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(emisionesDelLibro)
      .where(periodo ? eq(emisionesDelLibro.periodo, periodo) : undefined)
      .orderBy(desc(emisionesDelLibro.creadoEn), desc(emisionesDelLibro.folioDesde))
      .limit(LIMITE_DE_LA_LISTA);
    return filas.map(aEmision);
  }

  async buscarIgual(periodo: string, huella: string, version: number): Promise<EmisionDelLibro | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(emisionesDelLibro)
      .where(
        and(
          eq(emisionesDelLibro.periodo, periodo),
          eq(emisionesDelLibro.huellaDeDatos, huella),
          eq(emisionesDelLibro.versionDePlantilla, version),
        ),
      )
      .orderBy(desc(emisionesDelLibro.creadoEn))
      .limit(1);
    return fila ? aEmision(fila) : null;
  }

  async hayDelPeriodo(periodo: string): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: emisionesDelLibro.id })
      .from(emisionesDelLibro)
      .where(eq(emisionesDelLibro.periodo, periodo))
      .limit(1);
    return Boolean(fila);
  }

  async mayorFolioEmitido(): Promise<number> {
    const [fila] = await transaccionEnCurso()
      .select({ mayor: max(emisionesDelLibro.folioHasta) })
      .from(emisionesDelLibro);
    return fila?.mayor ?? 0;
  }
}

/** Una fila por empresa con el último folio; se bloquea al emitir para que dos emisiones se ordenen. */
export class RepositorioDeFoliacionDrizzle implements RepositorioDeFoliacion {
  async ultimoFolio(): Promise<number> {
    const [fila] = await transaccionEnCurso().select({ ultimo: foliacionDelLibro.ultimoFolio }).from(foliacionDelLibro);
    return fila?.ultimo ?? 0;
  }

  async bloquear(empresaId: string): Promise<number> {
    const transaccion = transaccionEnCurso();
    await transaccion.insert(foliacionDelLibro).values({ empresaId }).onConflictDoNothing();
    const [fila] = await transaccion
      .select({ ultimo: foliacionDelLibro.ultimoFolio })
      .from(foliacionDelLibro)
      .where(eq(foliacionDelLibro.empresaId, empresaId))
      .for('update');
    return fila?.ultimo ?? 0;
  }

  async fijarUltimoFolio(empresaId: string, ultimoFolio: number): Promise<void> {
    await transaccionEnCurso()
      .update(foliacionDelLibro)
      .set({ ultimoFolio })
      .where(eq(foliacionDelLibro.empresaId, empresaId));
  }
}
