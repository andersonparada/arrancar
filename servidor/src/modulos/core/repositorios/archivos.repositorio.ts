import { eq } from 'drizzle-orm';
import type { Transaccion } from '../base-datos/conexion.js';
import { archivos } from '../esquemas/archivos.esquema.js';

export type Archivo = typeof archivos.$inferSelect;
export type NuevoArchivo = typeof archivos.$inferInsert;

/** Siempre se usa dentro de `ejecutarEnEmpresa`, así RLS limita los archivos a la empresa. */
export const archivosRepositorio = {
  async crear(tx: Transaccion, datos: NuevoArchivo): Promise<Archivo> {
    const [archivo] = await tx.insert(archivos).values(datos).returning();
    return archivo!;
  },

  async buscarPorId(tx: Transaccion, id: string): Promise<Archivo | undefined> {
    const [archivo] = await tx.select().from(archivos).where(eq(archivos.id, id));
    return archivo;
  },
};
