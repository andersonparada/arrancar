import { and, eq, gt, lt } from 'drizzle-orm';
import { bd } from '../base-datos/conexion.js';
import { sesiones, usuarios } from '../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { nombreCompleto } from '../identidad/infraestructura/persistencia/consultas-usuarios.drizzle.js';

export type NuevaSesion = typeof sesiones.$inferInsert;

export interface SesionConUsuario {
  sesionId: string;
  empresaActivaId: string | null;
  expiraEn: Date;
  usuario: { id: string; usuario: string; nombre: string; esSuperacceso: boolean };
}

export const sesionesRepositorio = {
  async crear(datos: NuevaSesion): Promise<void> {
    await bd.insert(sesiones).values(datos);
  },

  /** Sesión no vencida cuyo usuario sigue activo. */
  async buscarVigentePorHash(hashToken: string): Promise<SesionConUsuario | undefined> {
    const [fila] = await bd
      .select({
        sesionId: sesiones.id,
        empresaActivaId: sesiones.empresaActivaId,
        expiraEn: sesiones.expiraEn,
        usuario: {
          id: usuarios.id,
          usuario: usuarios.usuario,
          nombre: nombreCompleto,
          esSuperacceso: usuarios.esSuperacceso,
        },
      })
      .from(sesiones)
      .innerJoin(usuarios, eq(usuarios.id, sesiones.usuarioId))
      .where(and(eq(sesiones.hashToken, hashToken), gt(sesiones.expiraEn, new Date()), eq(usuarios.activo, true)));
    return fila;
  },

  async fijarEmpresaActiva(sesionId: string, empresaId: string | null): Promise<void> {
    await bd.update(sesiones).set({ empresaActivaId: empresaId }).where(eq(sesiones.id, sesionId));
  },

  async extender(sesionId: string, expiraEn: Date): Promise<void> {
    await bd.update(sesiones).set({ expiraEn }).where(eq(sesiones.id, sesionId));
  },

  async eliminarPorHash(hashToken: string): Promise<void> {
    await bd.delete(sesiones).where(eq(sesiones.hashToken, hashToken));
  },

  async eliminarDeUsuario(usuarioId: string): Promise<void> {
    await bd.delete(sesiones).where(eq(sesiones.usuarioId, usuarioId));
  },

  async eliminarVencidas(): Promise<void> {
    await bd.delete(sesiones).where(lt(sesiones.expiraEn, new Date()));
  },
};
