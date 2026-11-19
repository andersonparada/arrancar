import { asc, eq, getTableColumns, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { LoteDto, SolicitudDeLote } from '../../aplicacion/dto/lote.dto.js';
import type { AlmacenDeLotes } from '../../aplicacion/puertos/almacen-de-lotes.js';
import { lotes } from './lotes.tablas.js';

const { empresaId, creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...columnas } = getTableColumns(lotes);

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class AlmacenDeLotesDrizzle implements AlmacenDeLotes {
  listar(articuloId: string): Promise<LoteDto[]> {
    return transaccionEnCurso()
      .select(columnas)
      .from(lotes)
      .where(eq(lotes.articuloId, articuloId))
      .orderBy(sql`${lotes.fechaDeVencimiento} asc nulls last`, asc(lotes.codigo));
  }

  async agregar(empresa: string, articuloId: string, datos: SolicitudDeLote): Promise<LoteDto> {
    const [fila] = await transaccionEnCurso()
      .insert(lotes)
      .values({ ...datos, articuloId, empresaId: empresa })
      .returning(columnas);
    return fila!;
  }
}
