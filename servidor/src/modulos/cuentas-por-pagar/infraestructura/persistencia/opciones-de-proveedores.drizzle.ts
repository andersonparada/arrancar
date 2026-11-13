import { and, asc, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { OpcionDeReferencia } from '../../../core/intercambio/aplicacion/columnas.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';

/**
 * Los proveedores activos de la cuenta para la columna «Proveedor» del Excel: se escriben por su nombre o por su NIT
 * (dos terceros pueden llamarse igual, el NIT no se repite). Las tablas tienen seguridad por cuenta (RLS).
 */
export class OpcionesDeProveedoresDrizzle {
  async listar(): Promise<OpcionDeReferencia[]> {
    const filas = await transaccionEnCurso()
      .select({ id: proveedores.id, nombre: terceros.nombreMostrar, nit: terceros.nit })
      .from(proveedores)
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .where(and(eq(proveedores.activo, true), eq(terceros.activo, true)))
      .orderBy(asc(terceros.nombreMostrar));
    return filas.map(({ id, nombre, nit }) => ({ id, nombre, ...(nit ? { codigo: nit } : {}) }));
  }
}
