import { and, eq, inArray } from 'drizzle-orm';
import type { Ejecutor } from '../../../base-datos/conexion.js';
import { roles } from '../../../autorizacion/infraestructura/persistencia/roles.tablas.js';
import { transaccionEnCurso } from '../../../compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresas, empresaUsuarios } from '../../../esquemas/empresas.esquema.js';
import type { AccesosAEmpresas } from '../../aplicacion/puertos/accesos-a-empresas.js';
import type { AccesoAEmpresa } from '../../dominio/acceso-a-empresa.js';

/** Ni `core.empresa_usuarios` ni `core.roles` tienen seguridad por filas: se filtra por cuenta. */
export class AccesosAEmpresasDrizzle implements AccesosAEmpresas {
  constructor(private readonly ejecutor: () => Ejecutor = transaccionEnCurso) {}

  async empresasDeLaCuenta(cuentaId: string): Promise<Set<string>> {
    const filas = await this.ejecutor()
      .select({ id: empresas.id })
      .from(empresas)
      .where(eq(empresas.cuentaId, cuentaId));
    return new Set(filas.map((fila) => fila.id));
  }

  async rolesDeLaCuenta(cuentaId: string): Promise<Set<string>> {
    const filas = await this.ejecutor().select({ id: roles.id }).from(roles).where(eq(roles.cuentaId, cuentaId));
    return new Set(filas.map((fila) => fila.id));
  }

  async reemplazarEnCuenta(usuarioId: string, cuentaId: string, accesos: readonly AccesoAEmpresa[]): Promise<void> {
    const empresasDeLaCuenta = [...(await this.empresasDeLaCuenta(cuentaId))];
    if (empresasDeLaCuenta.length > 0) {
      await this.ejecutor()
        .delete(empresaUsuarios)
        .where(and(eq(empresaUsuarios.usuarioId, usuarioId), inArray(empresaUsuarios.empresaId, empresasDeLaCuenta)));
    }
    if (accesos.length > 0) {
      await this.ejecutor()
        .insert(empresaUsuarios)
        .values(accesos.map(({ empresaId, rolId }) => ({ empresaId, rolId, usuarioId })));
    }
  }
}
