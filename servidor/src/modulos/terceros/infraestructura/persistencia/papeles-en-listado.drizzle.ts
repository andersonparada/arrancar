import { eq, inArray, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ClienteEnListadoDto, ProveedorEnListadoDto } from '../../aplicacion/dto/tercero.dto.js';
import type { ClaseDeCliente } from '../../dominio/papeles.js';
import { clientes } from './clientes.tablas.js';
import { categoriasProveedor, proveedores } from './proveedores.tablas.js';

export interface PapelesEnListado {
  clientes: Map<string, ClienteEnListadoDto>;
  proveedores: Map<string, ProveedorEnListadoDto>;
}

/** Los papeles de varios terceros de una vez, con la clase y el nombre de la categoría. */
export async function papelesDe(terceroIds: string[]): Promise<PapelesEnListado> {
  if (terceroIds.length === 0) return { clientes: new Map(), proveedores: new Map() };
  const tx = transaccionEnCurso();
  const [filasDeClientes, filasDeProveedores] = await Promise.all([
    tx
      .select({ terceroId: clientes.terceroId, clase: sql<ClaseDeCliente>`${clientes.clase}`, activo: clientes.activo })
      .from(clientes)
      .where(inArray(clientes.terceroId, terceroIds)),
    tx
      .select({
        terceroId: proveedores.terceroId,
        categoriaId: proveedores.categoriaId,
        categoriaNombre: categoriasProveedor.nombre,
        activo: proveedores.activo,
      })
      .from(proveedores)
      .leftJoin(categoriasProveedor, eq(categoriasProveedor.id, proveedores.categoriaId))
      .where(inArray(proveedores.terceroId, terceroIds)),
  ]);
  return {
    clientes: new Map(filasDeClientes.map(({ terceroId, ...cliente }) => [terceroId, cliente])),
    proveedores: new Map(filasDeProveedores.map(({ terceroId, ...proveedor }) => [terceroId, proveedor])),
  };
}
