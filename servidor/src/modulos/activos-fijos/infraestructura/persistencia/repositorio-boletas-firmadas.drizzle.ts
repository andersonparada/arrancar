import { eq, sql } from 'drizzle-orm';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioBoletasFirmadas } from '../../aplicacion/puertos/repositorio-boletas-firmadas.js';
import { boletasFirmadas } from './boletas-firmadas.tablas.js';

/** La seguridad por empresa (RLS) limita lo que se ve: ninguna consulta filtra por empresa. */
export class RepositorioBoletasFirmadasDrizzle implements RepositorioBoletasFirmadas {
  async bloquear(grupoId: string): Promise<void> {
    await transaccionEnCurso().execute(
      sql`select pg_advisory_xact_lock(hashtext(${`activos-fijos.boleta-firmada:${grupoId}`}))`,
    );
  }

  async archivoDe(grupoId: string): Promise<string | null> {
    const [fila] = await transaccionEnCurso()
      .select({ archivoId: boletasFirmadas.archivoId })
      .from(boletasFirmadas)
      .where(eq(boletasFirmadas.grupoId, grupoId));
    return fila?.archivoId ?? null;
  }

  /** Quien llama ya tomó `bloquear`, así que no hay otra subida entre mirar y escribir. */
  async poner(grupoId: string, archivoId: string): Promise<void> {
    const bd = transaccionEnCurso();
    if ((await this.archivoDe(grupoId)) === null) {
      await bd.insert(boletasFirmadas).values({ empresaId: contextoEnCurso().empresaId, grupoId, archivoId });
      return;
    }
    await bd.update(boletasFirmadas).set({ archivoId }).where(eq(boletasFirmadas.grupoId, grupoId));
  }
}
