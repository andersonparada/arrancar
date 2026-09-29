import { sql } from 'drizzle-orm';
import type { Correlativos, NumeroAsignado, PoliticaDeReinicioAnual } from '../aplicacion/correlativos.js';
import { correlativos } from './persistencia/correlativos.tablas.js';
import { contextoEnCurso, transaccionEnCurso } from './unidad-de-trabajo-postgres.js';

const ANIO_SIN_REINICIO = 0;

/** El año (`AAAA`) de una fecha `AAAA-MM-DD`. */
const anioDe = (fecha: string): number => Number(fecha.slice(0, 4));

/**
 * Entrega el siguiente número con un solo `insert … on conflict do update … returning`: la fila
 * queda bloqueada hasta el final de la transacción, así dos operaciones de la misma empresa y
 * clave no reciben el mismo número y una que se deshace no consume el suyo.
 */
export class CorrelativosPostgres implements Correlativos {
  constructor(private readonly reinicioAnual: PoliticaDeReinicioAnual) {}

  async siguiente(clave: string, fecha: string): Promise<NumeroAsignado> {
    const contexto = contextoEnCurso();
    const anio = (await this.reinicioAnual.aplica(contexto)) ? anioDe(fecha) : ANIO_SIN_REINICIO;
    const [fila] = await transaccionEnCurso()
      .insert(correlativos)
      .values({ empresaId: contexto.empresaId, clave, anio, siguiente: 2 })
      .onConflictDoUpdate({
        target: [correlativos.empresaId, correlativos.clave, correlativos.anio],
        set: { siguiente: sql`${correlativos.siguiente} + 1` },
      })
      .returning({ numero: sql<number>`${correlativos.siguiente} - 1` });
    return { numero: fila!.numero, anio };
  }
}
