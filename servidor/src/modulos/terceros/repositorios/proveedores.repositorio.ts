import { asc, eq, inArray } from 'drizzle-orm';
import type { Transaccion } from '../../core/base-datos/conexion.js';
import { categoriasProveedor, proveedores } from '../esquemas/proveedores.esquema.js';

export type Proveedor = typeof proveedores.$inferSelect;
export type NuevoProveedor = typeof proveedores.$inferInsert;
export type CambiosProveedor = Partial<
  Omit<NuevoProveedor, 'id' | 'cuentaId' | 'terceroId' | 'creadoEn' | 'actualizadoEn'>
>;
export type CategoriaProveedor = typeof categoriasProveedor.$inferSelect;

export const proveedoresRepositorio = {
  async buscarPorTercero(tx: Transaccion, terceroId: string): Promise<Proveedor | undefined> {
    const [proveedor] = await tx.select().from(proveedores).where(eq(proveedores.terceroId, terceroId));
    return proveedor;
  },

  /** Ids de terceros (de entre los indicados) que ya tienen el papel de proveedor. */
  async terceroIdsConPapel(tx: Transaccion, terceroIds: string[]): Promise<Set<string>> {
    if (terceroIds.length === 0) return new Set();
    const filas = await tx
      .select({ terceroId: proveedores.terceroId })
      .from(proveedores)
      .where(inArray(proveedores.terceroId, terceroIds));
    return new Set(filas.map((f) => f.terceroId));
  },

  async crear(tx: Transaccion, datos: NuevoProveedor): Promise<Proveedor> {
    const [proveedor] = await tx.insert(proveedores).values(datos).returning();
    return proveedor!;
  },

  async actualizar(tx: Transaccion, id: string, cambios: CambiosProveedor): Promise<Proveedor> {
    const [proveedor] = await tx.update(proveedores).set(cambios).where(eq(proveedores.id, id)).returning();
    return proveedor!;
  },

  async listarCategorias(tx: Transaccion): Promise<CategoriaProveedor[]> {
    return tx.select().from(categoriasProveedor).orderBy(asc(categoriasProveedor.nombre));
  },

  async buscarCategoriaPorId(tx: Transaccion, id: string): Promise<CategoriaProveedor | undefined> {
    const [categoria] = await tx.select().from(categoriasProveedor).where(eq(categoriasProveedor.id, id));
    return categoria;
  },

  async crearCategoria(tx: Transaccion, cuentaId: string, nombre: string): Promise<CategoriaProveedor> {
    const [categoria] = await tx.insert(categoriasProveedor).values({ cuentaId, nombre }).returning();
    return categoria!;
  },

  async actualizarCategoria(
    tx: Transaccion,
    id: string,
    cambios: { nombre?: string; activo?: boolean },
  ): Promise<CategoriaProveedor> {
    const [categoria] = await tx.update(categoriasProveedor).set(cambios).where(eq(categoriasProveedor.id, id)).returning();
    return categoria!;
  },
};
