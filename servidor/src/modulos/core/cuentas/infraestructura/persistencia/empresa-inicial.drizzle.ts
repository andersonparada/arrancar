import type { Ejecutor } from '../../../base-datos/conexion.js';
import { empresas, empresaUsuarios } from '../../../esquemas/empresas.esquema.js';
import type { EmpresaInicial } from '../../aplicacion/puertos/transaccion-de-alta.js';

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

  async darAccesoAlPropietario(acceso: { empresaId: string; usuarioId: string; rolId: string }): Promise<void> {
    await this.ejecutor.insert(empresaUsuarios).values(acceso);
  }
}
