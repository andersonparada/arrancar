import { sql } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { DepuradorDeAuditoria } from '../../aplicacion/puertos/depurador-de-auditoria.js';

/**
 * La app no puede borrar la auditoría: lo hace la función `core.depurar_auditoria` (migraciones 0009, 0011 y 0024).
 * Borra lo anterior a `max(meses, 60)` meses, salvo las entradas con empresa de un recurso de
 * `core.recursos_de_auditoria_permanente`, que se conservan mientras la empresa exista.
 */
export class DepuradorDeAuditoriaDrizzle implements DepuradorDeAuditoria {
  constructor(private readonly baseDatos: BaseDatos) {}

  async borrarAnterioresA(meses: number): Promise<number> {
    const resultado = await this.baseDatos.execute<{ borradas: number }>(
      sql`select core.depurar_auditoria(${meses}) as borradas`,
    );
    return resultado.rows[0]?.borradas ?? 0;
  }
}
