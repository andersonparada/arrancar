import { eq, inArray } from 'drizzle-orm';
import type { Transaccion } from '../../core/base-datos/conexion.js';
import { trabajadores } from '../esquemas/trabajadores.esquema.js';

export type Trabajador = typeof trabajadores.$inferSelect;
export type NuevoTrabajador = typeof trabajadores.$inferInsert;
export type CambiosTrabajador = Partial<
  Omit<NuevoTrabajador, 'id' | 'cuentaId' | 'terceroId' | 'creadoEn' | 'actualizadoEn'>
>;

export const trabajadoresRepositorio = {
  async buscarPorTercero(tx: Transaccion, terceroId: string): Promise<Trabajador | undefined> {
    const [trabajador] = await tx.select().from(trabajadores).where(eq(trabajadores.terceroId, terceroId));
    return trabajador;
  },

  /** Ids de terceros (de entre los indicados) que ya tienen el papel de trabajador. */
  async terceroIdsConPapel(tx: Transaccion, terceroIds: string[]): Promise<Set<string>> {
    if (terceroIds.length === 0) return new Set();
    const filas = await tx
      .select({ terceroId: trabajadores.terceroId })
      .from(trabajadores)
      .where(inArray(trabajadores.terceroId, terceroIds));
    return new Set(filas.map((f) => f.terceroId));
  },

  async crear(tx: Transaccion, datos: NuevoTrabajador): Promise<Trabajador> {
    const [trabajador] = await tx.insert(trabajadores).values(datos).returning();
    return trabajador!;
  },

  async actualizar(tx: Transaccion, id: string, cambios: CambiosTrabajador): Promise<Trabajador> {
    const [trabajador] = await tx.update(trabajadores).set(cambios).where(eq(trabajadores.id, id)).returning();
    return trabajador!;
  },
};
