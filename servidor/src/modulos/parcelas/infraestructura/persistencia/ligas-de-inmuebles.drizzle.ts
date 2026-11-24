import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { inmuebles } from '../../../empresas/infraestructura/persistencia/inmuebles.tablas.js';
import type { InmuebleDeParcelaDto, LigaConInmueble } from '../../aplicacion/dto/parcela.dto.js';
import type { LigasDeInmuebles } from '../../aplicacion/puertos/repositorio-parcelas.js';
import { parcelasDeInmuebles } from './parcelas-de-inmuebles.tablas.js';

const columnas = {
  inmuebleId: parcelasDeInmuebles.inmuebleId,
  inmuebleNombre: inmuebles.nombre,
  superficieM2: parcelasDeInmuebles.superficieM2,
};

/** Las ligas entre parcelas e inmuebles registrales; las de un inmueble que el operador no ve no aparecen. */
export class LigasDeInmueblesDrizzle implements LigasDeInmuebles {
  async listar(parcelaId: string): Promise<InmuebleDeParcelaDto[]> {
    return this.consulta().where(eq(parcelasDeInmuebles.parcelaId, parcelaId)).orderBy(asc(inmuebles.nombre));
  }

  async nombresPorParcela(): Promise<Map<string, string[]>> {
    const filas = await transaccionEnCurso()
      .select({ parcelaId: parcelasDeInmuebles.parcelaId, nombre: inmuebles.nombre })
      .from(parcelasDeInmuebles)
      .innerJoin(inmuebles, eq(parcelasDeInmuebles.inmuebleId, inmuebles.id))
      .orderBy(asc(inmuebles.nombre));
    const porParcela = new Map<string, string[]>();
    for (const { parcelaId, nombre } of filas)
      porParcela.set(parcelaId, [...(porParcela.get(parcelaId) ?? []), nombre]);
    return porParcela;
  }

  async reemplazar(
    { empresaId, parcelaId }: { empresaId: string; parcelaId: string },
    ligas: LigaConInmueble[],
  ): Promise<InmuebleDeParcelaDto[]> {
    const actuales = await this.listar(parcelaId);
    const nuevos = new Set(ligas.map(({ inmuebleId }) => inmuebleId));
    const quitadas = actuales.filter(({ inmuebleId }) => !nuevos.has(inmuebleId));
    await this.quitar(parcelaId, quitadas);
    await this.guardar({ empresaId, parcelaId }, ligas);
    return quitadas;
  }

  private async quitar(parcelaId: string, quitadas: InmuebleDeParcelaDto[]): Promise<void> {
    if (quitadas.length === 0) return;
    const ids = quitadas.map(({ inmuebleId }) => inmuebleId);
    await transaccionEnCurso()
      .delete(parcelasDeInmuebles)
      .where(and(eq(parcelasDeInmuebles.parcelaId, parcelaId), inArray(parcelasDeInmuebles.inmuebleId, ids)));
  }

  /** Agrega las ligas nuevas y pone a las que ya estaban la porción que se escribió. */
  private async guardar(destino: { empresaId: string; parcelaId: string }, ligas: LigaConInmueble[]): Promise<void> {
    if (ligas.length === 0) return;
    const filas = ligas.map(({ inmuebleId, superficieM2 }) => ({ ...destino, inmuebleId, superficieM2 }));
    await transaccionEnCurso()
      .insert(parcelasDeInmuebles)
      .values(filas)
      .onConflictDoUpdate({
        target: [parcelasDeInmuebles.parcelaId, parcelasDeInmuebles.inmuebleId],
        set: { superficieM2: sql`excluded.superficie_m2` },
      });
  }

  private consulta() {
    return transaccionEnCurso()
      .select(columnas)
      .from(parcelasDeInmuebles)
      .innerJoin(inmuebles, eq(parcelasDeInmuebles.inmuebleId, inmuebles.id));
  }
}
