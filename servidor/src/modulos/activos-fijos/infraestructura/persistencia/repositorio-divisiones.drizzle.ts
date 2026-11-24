import { eq, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioDivisiones } from '../../aplicacion/puertos/repositorio-divisiones.js';
import type { Division, DivisionId } from '../../dominio/division.js';
import { mapeadorDeDivision } from './division.mapeador.js';
import { divisiones } from './divisiones.tablas.js';

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDivisionesDrizzle implements RepositorioDivisiones {
  /**
   * El `creado_en` es la hora real del momento (`clock_timestamp`) y no la de inicio de la transacción: así las divisiones
   * de una misma operación («separar en unidades») quedan en orden y se sabe cuál es posterior a cuál (§6.11, I-9).
   */
  async agregar(division: Division): Promise<void> {
    await transaccionEnCurso()
      .insert(divisiones)
      .values({ ...mapeadorDeDivision.aFila(division), creadoEn: sql`clock_timestamp()` });
  }

  async buscar(id: DivisionId): Promise<Division | null> {
    const [fila] = await transaccionEnCurso().select().from(divisiones).where(eq(divisiones.id, id.valor));
    return fila ? mapeadorDeDivision.aEntidad(fila) : null;
  }

  async guardar(division: Division): Promise<void> {
    await transaccionEnCurso()
      .update(divisiones)
      .set(mapeadorDeDivision.aFila(division))
      .where(eq(divisiones.id, division.id.valor));
  }
}
