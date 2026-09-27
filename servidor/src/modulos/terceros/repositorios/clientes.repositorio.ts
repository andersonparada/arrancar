import { eq, inArray } from 'drizzle-orm';
import type { Transaccion } from '../../core/base-datos/conexion.js';
import { clientes } from '../esquemas/clientes.esquema.js';

export type Cliente = typeof clientes.$inferSelect;
export type NuevoCliente = typeof clientes.$inferInsert;
export type CambiosCliente = Partial<
  Omit<NuevoCliente, 'id' | 'cuentaId' | 'terceroId' | 'creadoEn' | 'actualizadoEn'>
>;

export const clientesRepositorio = {
  async buscarPorTercero(tx: Transaccion, terceroId: string): Promise<Cliente | undefined> {
    const [cliente] = await tx.select().from(clientes).where(eq(clientes.terceroId, terceroId));
    return cliente;
  },

  /** Ids de terceros (de entre los indicados) que ya tienen el papel de cliente. */
  async terceroIdsConPapel(tx: Transaccion, terceroIds: string[]): Promise<Set<string>> {
    if (terceroIds.length === 0) return new Set();
    const filas = await tx
      .select({ terceroId: clientes.terceroId })
      .from(clientes)
      .where(inArray(clientes.terceroId, terceroIds));
    return new Set(filas.map((f) => f.terceroId));
  },

  async crear(tx: Transaccion, datos: NuevoCliente): Promise<Cliente> {
    const [cliente] = await tx.insert(clientes).values(datos).returning();
    return cliente!;
  },

  async actualizar(tx: Transaccion, id: string, cambios: CambiosCliente): Promise<Cliente> {
    const [cliente] = await tx.update(clientes).set(cambios).where(eq(clientes.id, id)).returning();
    return cliente!;
  },
};
