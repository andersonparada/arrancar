import { eq, inArray } from 'drizzle-orm';
import type { Ejecutor } from '../../../base-datos/conexion.js';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresas, empresaUsuarios } from '../../../cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { RepositorioUsuarios } from '../../aplicacion/puertos/repositorio-usuarios.js';
import type { NombreDeUsuario } from '../../dominio/nombre-de-usuario.js';
import type { Usuario, UsuarioId } from '../../dominio/usuario.js';
import { mapeadorDeUsuario } from './usuario.mapeador.js';
import { usuarios } from './usuarios.tablas.js';

/**
 * `core.usuarios` no tiene seguridad por filas: un usuario puede trabajar en
 * varias cuentas. Por omisión trabaja en la transacción de la unidad de trabajo;
 * quien arma su propia transacción (el alta de cuentas) indica el ejecutor.
 */
export class RepositorioUsuariosDrizzle implements RepositorioUsuarios {
  constructor(private readonly ejecutor: () => Ejecutor = transaccionEnCurso) {}

  async buscar(id: UsuarioId): Promise<Usuario | null> {
    const [fila] = await this.ejecutor().select().from(usuarios).where(eq(usuarios.id, id.valor));
    return fila ? mapeadorDeUsuario.aEntidad(fila) : null;
  }

  async buscarPorNombre(nombre: NombreDeUsuario): Promise<Usuario | null> {
    const [fila] = await this.ejecutor().select().from(usuarios).where(eq(usuarios.usuario, nombre.valor));
    return fila ? mapeadorDeUsuario.aEntidad(fila) : null;
  }

  async nombresOcupados(candidatos: string[]): Promise<Set<string>> {
    if (candidatos.length === 0) return new Set();
    const filas = await this.ejecutor()
      .select({ usuario: usuarios.usuario })
      .from(usuarios)
      .where(inArray(usuarios.usuario, candidatos));
    return new Set(filas.map((fila) => fila.usuario));
  }

  async cuentasDe(id: UsuarioId): Promise<string[]> {
    const filas = await this.ejecutor()
      .selectDistinct({ cuentaId: empresas.cuentaId })
      .from(empresaUsuarios)
      .innerJoin(empresas, eq(empresas.id, empresaUsuarios.empresaId))
      .where(eq(empresaUsuarios.usuarioId, id.valor));
    return filas.map((fila) => fila.cuentaId);
  }

  async agregar(usuario: Usuario): Promise<void> {
    await this.ejecutor().insert(usuarios).values(mapeadorDeUsuario.aFila(usuario));
  }

  async actualizar(usuario: Usuario): Promise<void> {
    const {
      id,
      usuario: _nombreDeUsuario,
      esSuperacceso: _esSuperacceso,
      ...cambios
    } = mapeadorDeUsuario.aFila(usuario);
    await this.ejecutor().update(usuarios).set(cambios).where(eq(usuarios.id, id));
  }

  async registrarAcceso(id: UsuarioId): Promise<void> {
    await this.ejecutor().update(usuarios).set({ ultimoAccesoEn: new Date() }).where(eq(usuarios.id, id.valor));
  }
}
