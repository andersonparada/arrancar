import { asc, eq } from 'drizzle-orm';
import { normalizarNit } from '../../../core/compartido/dominio/objetos-valor/nit.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { proveedores } from '../../../terceros/infraestructura/persistencia/proveedores.tablas.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { IdentidadDeProveedor, PlazoDeProveedorDto } from '../../aplicacion/dto/plazo-de-proveedor.dto.js';
import type { ProveedoresDeLosPlazos } from '../../aplicacion/puertos/puertos-de-plazos.js';
import { CONDICIONES_POR_OMISION } from '../../dominio/condiciones-de-proveedor.js';
import { condicionesDeProveedor } from './condiciones-de-proveedor.tablas.js';

/** Las tablas tienen seguridad por cuenta (RLS): solo se ven los proveedores de la cuenta activa. */
export class ProveedoresDeLosPlazosDrizzle implements ProveedoresDeLosPlazos {
  async listar(): Promise<PlazoDeProveedorDto[]> {
    const filas = await transaccionEnCurso()
      .select({
        proveedorId: proveedores.id,
        nit: terceros.nit,
        proveedorNombre: terceros.nombreMostrar,
        diasDeCredito: condicionesDeProveedor.diasDeCredito,
        contarDesdeLaRecepcion: condicionesDeProveedor.contarDesdeLaRecepcion,
      })
      .from(proveedores)
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .leftJoin(condicionesDeProveedor, eq(condicionesDeProveedor.proveedorId, proveedores.id))
      .orderBy(asc(terceros.nombreMostrar), asc(proveedores.id));
    return filas.map((fila) => ({
      ...fila,
      diasDeCredito: fila.diasDeCredito ?? CONDICIONES_POR_OMISION.diasDeCredito,
      contarDesdeLaRecepcion: fila.contarDesdeLaRecepcion ?? CONDICIONES_POR_OMISION.contarDesdeLaRecepcion,
    }));
  }

  async buscar({ nit, proveedorNombre }: IdentidadDeProveedor): Promise<string[]> {
    const criterio = nit ? eq(terceros.nit, normalizarNit(nit)) : eq(terceros.nombreMostrar, proveedorNombre ?? '');
    const filas = await transaccionEnCurso()
      .select({ id: proveedores.id })
      .from(proveedores)
      .innerJoin(terceros, eq(terceros.id, proveedores.terceroId))
      .where(criterio);
    return filas.map(({ id }) => id);
  }
}
