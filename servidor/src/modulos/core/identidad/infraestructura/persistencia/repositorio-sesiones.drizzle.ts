import { and, eq, gt, lt } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { CierreDeSesiones } from '../../aplicacion/puertos/cierre-de-sesiones.js';
import type { NuevaSesion, RepositorioSesiones, SesionVigente } from '../../aplicacion/puertos/repositorio-sesiones.js';
import { nombreCompleto } from './consultas-usuarios.drizzle.js';
import { sesiones, usuarios } from './usuarios.tablas.js';

/** Las sesiones se usan antes de saber la empresa, así que van por la conexión directa. */
export class RepositorioSesionesDrizzle implements RepositorioSesiones, CierreDeSesiones {
  constructor(private readonly bd: BaseDatos) {}

  async abrir({ huella, ...sesion }: NuevaSesion): Promise<void> {
    await this.bd.insert(sesiones).values({ ...sesion, hashToken: huella });
  }

  async buscarVigente(huella: string): Promise<SesionVigente | null> {
    const [fila] = await this.bd
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
      .where(and(eq(sesiones.hashToken, huella), gt(sesiones.expiraEn, new Date()), eq(usuarios.activo, true)));
    return fila ?? null;
  }

  async fijarEmpresaActiva(sesionId: string, empresaId: string): Promise<void> {
    await this.bd.update(sesiones).set({ empresaActivaId: empresaId }).where(eq(sesiones.id, sesionId));
  }

  async extender(sesionId: string, expiraEn: Date): Promise<void> {
    await this.bd.update(sesiones).set({ expiraEn }).where(eq(sesiones.id, sesionId));
  }

  async cerrar(huella: string): Promise<void> {
    await this.bd.delete(sesiones).where(eq(sesiones.hashToken, huella));
  }

  async cerrarTodasDe(usuarioId: string): Promise<void> {
    await this.bd.delete(sesiones).where(eq(sesiones.usuarioId, usuarioId));
  }

  async cerrarVencidas(): Promise<void> {
    await this.bd.delete(sesiones).where(lt(sesiones.expiraEn, new Date()));
  }
}
