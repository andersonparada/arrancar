import { and, asc, count, eq } from 'drizzle-orm';
import { bd, type Ejecutor } from '../base-datos/conexion.js';
import { cuentaModulos, cuentas } from '../esquemas/cuentas.esquema.js';
import { empresas } from '../esquemas/empresas.esquema.js';

export type Cuenta = typeof cuentas.$inferSelect;

export interface CuentaResumen extends Cuenta {
  totalEmpresas: number;
}

export const cuentasRepositorio = {
  async listar(): Promise<CuentaResumen[]> {
    return bd
      .select({
        id: cuentas.id,
        nombre: cuentas.nombre,
        activa: cuentas.activa,
        creadoEn: cuentas.creadoEn,
        actualizadoEn: cuentas.actualizadoEn,
        totalEmpresas: count(empresas.id),
      })
      .from(cuentas)
      .leftJoin(empresas, eq(empresas.cuentaId, cuentas.id))
      .groupBy(cuentas.id)
      .orderBy(asc(cuentas.nombre));
  },

  async buscarPorId(id: string, ejecutor: Ejecutor = bd): Promise<Cuenta | undefined> {
    const [cuenta] = await ejecutor.select().from(cuentas).where(eq(cuentas.id, id));
    return cuenta;
  },

  async crear(nombre: string, ejecutor: Ejecutor = bd): Promise<Cuenta> {
    const [cuenta] = await ejecutor.insert(cuentas).values({ nombre }).returning();
    return cuenta!;
  },

  async actualizar(id: string, cambios: { nombre?: string; activa?: boolean }): Promise<void> {
    await bd.update(cuentas).set(cambios).where(eq(cuentas.id, id));
  },

  /** Claves de los módulos contratados por la cuenta (sin contar los esenciales). */
  async clavesModulos(cuentaId: string, ejecutor: Ejecutor = bd): Promise<string[]> {
    const filas = await ejecutor
      .select({ clave: cuentaModulos.moduloClave })
      .from(cuentaModulos)
      .where(eq(cuentaModulos.cuentaId, cuentaId));
    return filas.map((f) => f.clave);
  },

  async activarModulo(cuentaId: string, moduloClave: string, ejecutor: Ejecutor = bd): Promise<void> {
    await ejecutor.insert(cuentaModulos).values({ cuentaId, moduloClave }).onConflictDoNothing();
  },

  async desactivarModulo(cuentaId: string, moduloClave: string): Promise<void> {
    await bd
      .delete(cuentaModulos)
      .where(and(eq(cuentaModulos.cuentaId, cuentaId), eq(cuentaModulos.moduloClave, moduloClave)));
  },
};
