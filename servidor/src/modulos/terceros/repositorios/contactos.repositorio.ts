import { eq } from 'drizzle-orm';
import type { Transaccion } from '../../core/base-datos/conexion.js';
import { contactos } from '../esquemas/contactos.esquema.js';

export type Contacto = typeof contactos.$inferSelect;
export type NuevoContacto = typeof contactos.$inferInsert;
export type CambiosContacto = Partial<Omit<NuevoContacto, 'id' | 'cuentaId' | 'terceroId' | 'creadoEn' | 'actualizadoEn'>>;

export const contactosRepositorio = {
  async listarDeTercero(tx: Transaccion, terceroId: string): Promise<Contacto[]> {
    return tx.select().from(contactos).where(eq(contactos.terceroId, terceroId)).orderBy(contactos.nombre);
  },

  async buscarPorId(tx: Transaccion, id: string): Promise<Contacto | undefined> {
    const [contacto] = await tx.select().from(contactos).where(eq(contactos.id, id));
    return contacto;
  },

  async crear(tx: Transaccion, datos: NuevoContacto): Promise<Contacto> {
    const [contacto] = await tx.insert(contactos).values(datos).returning();
    return contacto!;
  },

  async actualizar(tx: Transaccion, id: string, cambios: CambiosContacto): Promise<Contacto> {
    const [contacto] = await tx.update(contactos).set(cambios).where(eq(contactos.id, id)).returning();
    return contacto!;
  },

  async eliminar(tx: Transaccion, id: string): Promise<void> {
    await tx.delete(contactos).where(eq(contactos.id, id));
  },
};
