import { asc, eq, inArray } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { ConversionDto, SolicitudDeConversiones } from '../../aplicacion/dto/conversion.dto.js';
import type { AlmacenDeConversiones } from '../../aplicacion/puertos/almacen-de-conversiones.js';
import type { Magnitud } from '../../dominio/magnitudes.js';
import { conversiones } from './conversiones.tablas.js';
import { unidades } from './unidades.tablas.js';

/** Las dos tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class AlmacenDeConversionesDrizzle implements AlmacenDeConversiones {
  async listar(articuloId: string): Promise<ConversionDto[]> {
    return transaccionEnCurso()
      .select({
        unidadId: conversiones.unidadId,
        unidadNombre: unidades.nombre,
        factor: conversiones.factor,
        paraCompras: conversiones.paraCompras,
      })
      .from(conversiones)
      .innerJoin(unidades, eq(unidades.id, conversiones.unidadId))
      .where(eq(conversiones.articuloId, articuloId))
      .orderBy(asc(unidades.nombre));
  }

  async exigirUnidades(unidadIds: readonly string[]): Promise<ReadonlyMap<string, Magnitud>> {
    const pedidas = [...new Set(unidadIds)];
    if (pedidas.length === 0) return new Map();
    const halladas = await transaccionEnCurso()
      .select({ id: unidades.id, magnitud: unidades.magnitud })
      .from(unidades)
      .where(inArray(unidades.id, pedidas));
    if (halladas.length !== pedidas.length) throw new RecursoNoEncontrado('La unidad de medida');
    return new Map(halladas.map(({ id, magnitud }) => [id, magnitud]));
  }

  async reemplazar(
    articuloId: string,
    empresaId: string,
    nuevas: SolicitudDeConversiones['conversiones'],
  ): Promise<void> {
    await transaccionEnCurso().delete(conversiones).where(eq(conversiones.articuloId, articuloId));
    if (nuevas.length === 0) return;
    await transaccionEnCurso()
      .insert(conversiones)
      .values(nuevas.map((conversion) => ({ ...conversion, articuloId, empresaId })));
  }
}
