import { and, asc, eq, inArray } from 'drizzle-orm';
import { bd, type Ejecutor } from '../base-datos/conexion.js';
import { cuentas } from '../esquemas/cuentas.esquema.js';
import { roles } from '../autorizacion/infraestructura/persistencia/roles.tablas.js';
import { empresas, empresaUsuarios } from '../esquemas/empresas.esquema.js';

export type Empresa = typeof empresas.$inferSelect;
export type NuevaEmpresa = typeof empresas.$inferInsert;
export type CambiosEmpresa = Partial<Omit<NuevaEmpresa, 'id' | 'cuentaId' | 'creadoEn' | 'actualizadoEn'>>;

/** Empresa a la que un usuario puede entrar, con los datos que necesita el selector. */
export interface EmpresaDisponible {
  id: string;
  nombre: string;
  cuentaId: string;
  cuentaNombre: string;
}

export interface AccesoEmpresa {
  rolId: string;
  rolNombre: string;
  accesoTotal: boolean;
}

const columnasDisponible = {
  id: empresas.id,
  nombre: empresas.nombre,
  cuentaId: empresas.cuentaId,
  cuentaNombre: cuentas.nombre,
};

export const empresasRepositorio = {
  async listarDeCuenta(cuentaId: string): Promise<Empresa[]> {
    return bd.select().from(empresas).where(eq(empresas.cuentaId, cuentaId)).orderBy(asc(empresas.nombre));
  },

  async buscarPorId(id: string, ejecutor: Ejecutor = bd): Promise<Empresa | undefined> {
    const [empresa] = await ejecutor.select().from(empresas).where(eq(empresas.id, id));
    return empresa;
  },

  async buscarDeCuenta(id: string, cuentaId: string): Promise<Empresa | undefined> {
    const [empresa] = await bd
      .select()
      .from(empresas)
      .where(and(eq(empresas.id, id), eq(empresas.cuentaId, cuentaId)));
    return empresa;
  },

  async crear(datos: NuevaEmpresa, ejecutor: Ejecutor = bd): Promise<Empresa> {
    const [empresa] = await ejecutor.insert(empresas).values(datos).returning();
    return empresa!;
  },

  async actualizar(id: string, cambios: CambiosEmpresa, ejecutor: Ejecutor = bd): Promise<Empresa> {
    const [empresa] = await ejecutor.update(empresas).set(cambios).where(eq(empresas.id, id)).returning();
    return empresa!;
  },

  /** Empresas activas, de cuentas activas, a las que el usuario tiene acceso. */
  async listarDisponiblesParaUsuario(usuarioId: string): Promise<EmpresaDisponible[]> {
    return bd
      .select(columnasDisponible)
      .from(empresaUsuarios)
      .innerJoin(empresas, eq(empresas.id, empresaUsuarios.empresaId))
      .innerJoin(cuentas, eq(cuentas.id, empresas.cuentaId))
      .where(and(eq(empresaUsuarios.usuarioId, usuarioId), eq(empresas.activa, true), eq(cuentas.activa, true)))
      .orderBy(asc(cuentas.nombre), asc(empresas.nombre));
  },

  /** Ids de todas las empresas a las que el usuario tiene acceso, activas o no. */
  async listarAccesosDeUsuario(usuarioId: string): Promise<string[]> {
    const filas = await bd
      .select({ empresaId: empresaUsuarios.empresaId })
      .from(empresaUsuarios)
      .where(eq(empresaUsuarios.usuarioId, usuarioId));
    return filas.map((f) => f.empresaId);
  },

  /** Todas las empresas del sistema; solo para usuarios con superacceso. */
  async listarTodasDisponibles(): Promise<EmpresaDisponible[]> {
    return bd
      .select(columnasDisponible)
      .from(empresas)
      .innerJoin(cuentas, eq(cuentas.id, empresas.cuentaId))
      .orderBy(asc(cuentas.nombre), asc(empresas.nombre));
  },

  async buscarDisponible(empresaId: string): Promise<EmpresaDisponible | undefined> {
    const [empresa] = await bd
      .select(columnasDisponible)
      .from(empresas)
      .innerJoin(cuentas, eq(cuentas.id, empresas.cuentaId))
      .where(eq(empresas.id, empresaId));
    return empresa;
  },

  async obtenerAcceso(usuarioId: string, empresaId: string): Promise<AccesoEmpresa | undefined> {
    const [acceso] = await bd
      .select({ rolId: roles.id, rolNombre: roles.nombre, accesoTotal: roles.accesoTotal })
      .from(empresaUsuarios)
      .innerJoin(roles, eq(roles.id, empresaUsuarios.rolId))
      .innerJoin(empresas, eq(empresas.id, empresaUsuarios.empresaId))
      .innerJoin(cuentas, eq(cuentas.id, empresas.cuentaId))
      .where(
        and(
          eq(empresaUsuarios.usuarioId, usuarioId),
          eq(empresaUsuarios.empresaId, empresaId),
          eq(empresas.activa, true),
          eq(cuentas.activa, true),
        ),
      );
    return acceso;
  },

  async asignarAcceso(empresaId: string, usuarioId: string, rolId: string, ejecutor: Ejecutor = bd): Promise<void> {
    await ejecutor
      .insert(empresaUsuarios)
      .values({ empresaId, usuarioId, rolId })
      .onConflictDoUpdate({ target: [empresaUsuarios.empresaId, empresaUsuarios.usuarioId], set: { rolId } });
  },

  /** Sustituye los accesos del usuario a las empresas de una cuenta; no toca los de otras cuentas. */
  async reemplazarAccesosEnCuenta(
    usuarioId: string,
    cuentaId: string,
    accesos: { empresaId: string; rolId: string }[],
    ejecutor: Ejecutor = bd,
  ): Promise<void> {
    const empresasDeCuenta = await ejecutor
      .select({ id: empresas.id })
      .from(empresas)
      .where(eq(empresas.cuentaId, cuentaId));
    const ids = empresasDeCuenta.map((e) => e.id);
    if (ids.length > 0) {
      await ejecutor
        .delete(empresaUsuarios)
        .where(and(eq(empresaUsuarios.usuarioId, usuarioId), inArray(empresaUsuarios.empresaId, ids)));
    }
    if (accesos.length > 0) {
      await ejecutor.insert(empresaUsuarios).values(accesos.map((a) => ({ ...a, usuarioId })));
    }
  },
};
