import { and, asc, eq, sql } from 'drizzle-orm';
import { roles } from '../../../autorizacion/infraestructura/persistencia/roles.tablas.js';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import { empresas, empresaUsuarios } from '../../../esquemas/empresas.esquema.js';
import type { UsuarioDto } from '../../aplicacion/dto/usuario.dto.js';
import type { ConsultasUsuarios } from '../../aplicacion/puertos/consultas-usuarios.js';
import { usuarios } from './usuarios.tablas.js';

/** Nombre completo para mostrar: "nombres apellidos". */
export const nombreCompleto = sql<string>`trim(${usuarios.nombres} || ' ' || ${usuarios.apellidos})`;

type FilaDeAcceso = Omit<UsuarioDto, 'accesos'> & UsuarioDto['accesos'][number];

/** Junta en un usuario las filas de cada empresa donde trabaja. */
function agruparPorUsuario(filas: FilaDeAcceso[]): UsuarioDto[] {
  const porUsuario = new Map<string, UsuarioDto>();
  for (const { empresaId, empresaNombre, rolId, rolNombre, ...datos } of filas) {
    const usuario = porUsuario.get(datos.id) ?? { ...datos, accesos: [] };
    usuario.accesos.push({ empresaId, empresaNombre, rolId, rolNombre });
    porUsuario.set(datos.id, usuario);
  }
  return [...porUsuario.values()];
}

/** Las tablas no tienen seguridad por filas: se filtra por la cuenta. */
export class ConsultasUsuariosDrizzle implements ConsultasUsuarios {
  constructor(private readonly bd: BaseDatos) {}

  async listarDeCuenta(cuentaId: string): Promise<UsuarioDto[]> {
    const filas = await this.bd
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
    return agruparPorUsuario(filas);
  }
}
