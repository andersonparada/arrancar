import { and, eq, ilike, ne, or, sql } from 'drizzle-orm';
import type { Transaccion } from '../../core/base-datos/conexion.js';
import { NIT_CONSUMIDOR_FINAL, terceros } from '../esquemas/terceros.esquema.js';

export type Tercero = typeof terceros.$inferSelect;
export type NuevoTercero = typeof terceros.$inferInsert;
export type CambiosTercero = Partial<Omit<NuevoTercero, 'id' | 'cuentaId' | 'creadoEn' | 'actualizadoEn'>>;

export interface FiltrosTerceros {
  texto?: string;
  activo?: boolean;
}

export const tercerosRepositorio = {
  async crear(tx: Transaccion, datos: NuevoTercero): Promise<Tercero> {
    const [tercero] = await tx.insert(terceros).values(datos).returning();
    return tercero!;
  },

  async actualizar(tx: Transaccion, id: string, cambios: CambiosTercero): Promise<Tercero> {
    const [tercero] = await tx.update(terceros).set(cambios).where(eq(terceros.id, id)).returning();
    return tercero!;
  },

  async buscarPorId(tx: Transaccion, id: string): Promise<Tercero | undefined> {
    const [tercero] = await tx.select().from(terceros).where(eq(terceros.id, id));
    return tercero;
  },

  async listar(tx: Transaccion, filtros: FiltrosTerceros = {}): Promise<Tercero[]> {
    const condiciones = [];
    if (filtros.activo !== undefined) condiciones.push(eq(terceros.activo, filtros.activo));
    if (filtros.texto) {
      const patron = `%${filtros.texto}%`;
      condiciones.push(
        or(
          ilike(terceros.nombreMostrar, patron),
          ilike(terceros.nit, patron),
          ilike(terceros.dpi, patron),
          ilike(terceros.telefono, patron),
        ),
      );
    }
    return tx
      .select()
      .from(terceros)
      .where(condiciones.length > 0 ? and(...condiciones) : undefined)
      .orderBy(terceros.nombreMostrar);
  },

  /**
   * Terceros con el mismo NIT, el mismo DPI o un nombre muy parecido (excluye al
   * propio registro cuando se está editando). Sirve para avisar de duplicados
   * al crear o cambiar los datos de identificación.
   */
  async buscarPosiblesDuplicados(
    tx: Transaccion,
    datos: { nombreMostrar: string; nit: string | null; dpi: string | null },
    excluirId?: string,
  ): Promise<Tercero[]> {
    const coincidencias = [sql`similarity(${terceros.nombreMostrar}, ${datos.nombreMostrar}) > 0.5`];
    if (datos.nit && datos.nit !== NIT_CONSUMIDOR_FINAL) coincidencias.push(eq(terceros.nit, datos.nit));
    if (datos.dpi) coincidencias.push(eq(terceros.dpi, datos.dpi));

    return tx
      .select()
      .from(terceros)
      .where(and(or(...coincidencias), excluirId ? ne(terceros.id, excluirId) : undefined));
  },
};
