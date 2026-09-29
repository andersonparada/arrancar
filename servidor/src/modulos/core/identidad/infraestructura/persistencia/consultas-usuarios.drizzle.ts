import { and, asc, count, eq, sql } from 'drizzle-orm';
import {
  usuarioPermisos,
  usuarioRoles,
} from '../../../autorizacion/infraestructura/persistencia/permisos-de-usuario.tablas.js';
import { roles } from '../../../autorizacion/infraestructura/persistencia/roles.tablas.js';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import { empresas, empresaUsuarios } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { UsuarioDto } from '../../aplicacion/dto/usuario.dto.js';
import type { ConsultasUsuarios } from '../../aplicacion/puertos/consultas-usuarios.js';
import { usuarios } from './usuarios.tablas.js';

/** Nombre completo para mostrar: "nombres apellidos". */
export const nombreCompleto = sql<string>`trim(${usuarios.nombres} || ' ' || ${usuarios.apellidos})`;

type FilaDeEmpresa = Omit<UsuarioDto, 'empresas' | 'roles' | 'totalPermisosDirectos'> & UsuarioDto['empresas'][number];

/** Junta en un usuario las filas de cada empresa donde trabaja. */
function agruparPorUsuario(filas: FilaDeEmpresa[]): Map<string, UsuarioDto> {
  const porUsuario = new Map<string, UsuarioDto>();
  for (const { empresaId, empresaNombre, ...datos } of filas) {
    const usuario = porUsuario.get(datos.id) ?? { ...datos, empresas: [], roles: [], totalPermisosDirectos: 0 };
    usuario.empresas.push({ empresaId, empresaNombre });
    porUsuario.set(datos.id, usuario);
  }
  return porUsuario;
}

/** Las tablas no tienen seguridad por filas: se filtra por la cuenta. */
export class ConsultasUsuariosDrizzle implements ConsultasUsuarios {
  constructor(private readonly bd: BaseDatos) {}

  async listarDeCuenta(cuentaId: string): Promise<UsuarioDto[]> {
    const porUsuario = agruparPorUsuario(await this.empresasDe(cuentaId));
    for (const { usuarioId, ...rol } of await this.rolesDe(cuentaId)) porUsuario.get(usuarioId)?.roles.push(rol);
    for (const { usuarioId, total } of await this.permisosDirectosDe(cuentaId)) {
      const usuario = porUsuario.get(usuarioId);
      if (usuario) usuario.totalPermisosDirectos = total;
    }
    return [...porUsuario.values()];
  }

  private empresasDe(cuentaId: string) {
    return this.bd
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
      })
      .from(empresaUsuarios)
      .innerJoin(usuarios, eq(usuarios.id, empresaUsuarios.usuarioId))
      .innerJoin(empresas, eq(empresas.id, empresaUsuarios.empresaId))
      .where(and(eq(empresas.cuentaId, cuentaId), eq(usuarios.esSuperacceso, false)))
      .orderBy(asc(usuarios.nombres), asc(usuarios.apellidos), asc(empresas.nombre));
  }

  private rolesDe(cuentaId: string) {
    return this.bd
      .select({
        usuarioId: usuarioRoles.usuarioId,
        rolId: roles.id,
        rolNombre: roles.nombre,
        accesoTotal: roles.accesoTotal,
      })
      .from(usuarioRoles)
      .innerJoin(roles, eq(roles.id, usuarioRoles.rolId))
      .where(eq(usuarioRoles.cuentaId, cuentaId))
      .orderBy(asc(roles.nombre));
  }

  private permisosDirectosDe(cuentaId: string) {
    return this.bd
      .select({ usuarioId: usuarioPermisos.usuarioId, total: count() })
      .from(usuarioPermisos)
      .where(eq(usuarioPermisos.cuentaId, cuentaId))
      .groupBy(usuarioPermisos.usuarioId);
  }
}
