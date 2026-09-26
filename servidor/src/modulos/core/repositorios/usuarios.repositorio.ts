import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { bd, type Ejecutor } from '../base-datos/conexion.js';
import { usuarios } from '../esquemas/usuarios.esquema.js';
import { empresas, empresaUsuarios } from '../esquemas/empresas.esquema.js';
import { roles } from '../esquemas/roles.esquema.js';

export type Usuario = typeof usuarios.$inferSelect;
export type NuevoUsuario = typeof usuarios.$inferInsert;

export interface AccesoUsuario {
  empresaId: string;
  empresaNombre: string;
  rolId: string;
  rolNombre: string;
}

export interface UsuarioConAccesos {
  id: string;
  usuario: string;
  nombres: string;
  apellidos: string;
  correo: string | null;
  activo: boolean;
  ultimoAccesoEn: Date | null;
  accesos: AccesoUsuario[];
}

/** Nombre completo para mostrar: "nombres apellidos". */
export const nombreCompleto = sql<string>`trim(${usuarios.nombres} || ' ' || ${usuarios.apellidos})`;

/** El nombre de usuario se compara y guarda siempre en minúsculas. */
function normalizar(nombreUsuario: string): string {
  return nombreUsuario.trim().toLowerCase();
}

export const usuariosRepositorio = {
  async buscarPorUsuario(nombreUsuario: string, ejecutor: Ejecutor = bd): Promise<Usuario | undefined> {
    const [usuario] = await ejecutor.select().from(usuarios).where(eq(usuarios.usuario, normalizar(nombreUsuario)));
    return usuario;
  },

  async buscarPorId(id: string, ejecutor: Ejecutor = bd): Promise<Usuario | undefined> {
    const [usuario] = await ejecutor.select().from(usuarios).where(eq(usuarios.id, id));
    return usuario;
  },

  /** Cuáles de los nombres de usuario indicados ya están ocupados. */
  async usuariosOcupados(candidatos: string[], ejecutor: Ejecutor = bd): Promise<Set<string>> {
    if (candidatos.length === 0) return new Set();
    const filas = await ejecutor
      .select({ usuario: usuarios.usuario })
      .from(usuarios)
      .where(inArray(usuarios.usuario, candidatos));
    return new Set(filas.map((f) => f.usuario));
  },

  async crear(datos: NuevoUsuario, ejecutor: Ejecutor = bd): Promise<Usuario> {
    const [usuario] = await ejecutor
      .insert(usuarios)
      .values({ ...datos, usuario: normalizar(datos.usuario) })
      .returning();
    return usuario!;
  },

  async actualizar(id: string, cambios: Partial<NuevoUsuario>, ejecutor: Ejecutor = bd): Promise<void> {
    await ejecutor.update(usuarios).set(cambios).where(eq(usuarios.id, id));
  },

  async registrarAcceso(id: string): Promise<void> {
    await bd.update(usuarios).set({ ultimoAccesoEn: new Date() }).where(eq(usuarios.id, id));
  },

  /** Usuarios (sin los de soporte) con acceso a alguna empresa de la cuenta, con sus accesos. */
  async listarDeCuenta(cuentaId: string, ejecutor: Ejecutor = bd): Promise<UsuarioConAccesos[]> {
    const filas = await ejecutor
      .select({
        id: usuarios.id,
        usuario: usuarios.usuario,
        nombres: usuarios.nombres,
        apellidos: usuarios.apellidos,
        correo: usuarios.correo,
        activo: usuarios.activo,
        ultimoAccesoEn: usuarios.ultimoAccesoEn,
        empresaId: empresas.id,
        empresaNombre: empresas.nombre,
        rolId: roles.id,
        rolNombre: roles.nombre,
      })
      .from(empresaUsuarios)
      .innerJoin(usuarios, eq(usuarios.id, empresaUsuarios.usuarioId))
      .innerJoin(empresas, eq(empresas.id, empresaUsuarios.empresaId))
      .innerJoin(roles, eq(roles.id, empresaUsuarios.rolId))
      .where(and(eq(empresas.cuentaId, cuentaId), eq(usuarios.esSuperacceso, false)))
      .orderBy(asc(usuarios.nombres), asc(usuarios.apellidos), asc(empresas.nombre));

    const porUsuario = new Map<string, UsuarioConAccesos>();
    for (const { empresaId, empresaNombre, rolId, rolNombre, ...datos } of filas) {
      const usuario = porUsuario.get(datos.id) ?? { ...datos, accesos: [] };
      usuario.accesos.push({ empresaId, empresaNombre, rolId, rolNombre });
      porUsuario.set(datos.id, usuario);
    }
    return [...porUsuario.values()];
  },

  /** Cuentas en las que el usuario tiene acceso a al menos una empresa. */
  async cuentasDelUsuario(usuarioId: string, ejecutor: Ejecutor = bd): Promise<string[]> {
    const filas = await ejecutor
      .selectDistinct({ cuentaId: empresas.cuentaId })
      .from(empresaUsuarios)
      .innerJoin(empresas, eq(empresas.id, empresaUsuarios.empresaId))
      .where(eq(empresaUsuarios.usuarioId, usuarioId));
    return filas.map((f) => f.cuentaId);
  },
};
