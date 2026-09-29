import type { Ejecutor } from '../../../base-datos/conexion.js';
import { usuarioRoles } from '../../../autorizacion/infraestructura/persistencia/permisos-de-usuario.tablas.js';
import { empresas, empresaUsuarios } from './empresas.tablas.js';
import type { AccesoDelPropietario, EmpresaInicial } from '../../aplicacion/puertos/transaccion-de-alta.js';

/**
 * Escribe directo en las tablas de empresas (viven en el núcleo): el núcleo no
 * puede depender del módulo `empresas`, que se construye sobre él.
 */
export class EmpresaInicialDrizzle implements EmpresaInicial {
  constructor(private readonly ejecutor: Ejecutor) {}

  async registrar(cuentaId: string, { nombre, nit }: { nombre: string; nit: string | null }) {
    const [empresa] = await this.ejecutor
      .insert(empresas)
      .values({ cuentaId, nombre, nit })
      .returning({ id: empresas.id, nombre: empresas.nombre });
    return empresa!;
  }

  /** Lo hace miembro de la empresa y le da, en toda la cuenta, el rol Propietario. */
  async darAccesoAlPropietario({ cuentaId, empresaId, usuarioId, rolId }: AccesoDelPropietario): Promise<void> {
    await this.ejecutor.insert(empresaUsuarios).values({ empresaId, usuarioId });
    await this.ejecutor.insert(usuarioRoles).values({ cuentaId, usuarioId, rolId });
  }
}
