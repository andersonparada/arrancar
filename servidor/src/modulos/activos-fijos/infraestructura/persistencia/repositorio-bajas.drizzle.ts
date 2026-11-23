import { and, asc, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioBajas } from '../../aplicacion/puertos/repositorio-bajas.js';
import type { Baja, BajaId } from '../../dominio/baja.js';
import { mapeadorDeBaja } from './baja.mapeador.js';
import { bajas } from './bajas.tablas.js';
import { enTandas } from './en-tandas.js';

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioBajasDrizzle implements RepositorioBajas {
  async agregarVarios(nuevas: readonly Baja[]): Promise<void> {
    for (const tanda of enTandas(nuevas))
      await transaccionEnCurso()
        .insert(bajas)
        .values(tanda.map((baja) => mapeadorDeBaja.aFila(baja)));
  }

  async buscar(id: BajaId): Promise<Baja | null> {
    const [fila] = await transaccionEnCurso().select().from(bajas).where(eq(bajas.id, id.valor));
    return fila ? mapeadorDeBaja.aEntidad(fila) : null;
  }

  async buscarBloqueando(id: BajaId): Promise<Baja | null> {
    const [fila] = await transaccionEnCurso().select().from(bajas).where(eq(bajas.id, id.valor)).for('update');
    return fila ? mapeadorDeBaja.aEntidad(fila) : null;
  }

  async guardar(baja: Baja): Promise<void> {
    const { estado, anuladaEn, anuladaPor, motivoDeAnulacion, actaArchivoId, tipoDeActa, denunciaArchivoId } =
      mapeadorDeBaja.aFila(baja);
    await transaccionEnCurso()
      .update(bajas)
      .set({ estado, anuladaEn, anuladaPor, motivoDeAnulacion, actaArchivoId, tipoDeActa, denunciaArchivoId })
      .where(eq(bajas.id, baja.id.valor));
  }

  async delActo({ numero, anioDeNumero }: { numero: number; anioDeNumero: number }): Promise<Baja[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(bajas)
      .where(and(eq(bajas.numero, numero), eq(bajas.anioDeNumero, anioDeNumero)))
      .orderBy(asc(bajas.creadoEn), asc(bajas.id));
    return filas.map((fila) => mapeadorDeBaja.aEntidad(fila));
  }

  async vigenteDeActivo(activoId: string): Promise<Baja | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(bajas)
      .where(and(eq(bajas.activoId, activoId), eq(bajas.estado, 'vigente')));
    return fila ? mapeadorDeBaja.aEntidad(fila) : null;
  }
}
