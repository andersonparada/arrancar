import { sql } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { DepuradorDeAuditoria } from '../../aplicacion/puertos/depurador-de-auditoria.js';

/** La app no puede borrar la auditoría: lo hace la función `core.depurar_auditoria` (migración 0009). */
export class DepuradorDeAuditoriaDrizzle implements DepuradorDeAuditoria {
  constructor(private readonly baseDatos: BaseDatos) {}

  async borrarAnterioresA(meses: number): Promise<number> {
    const resultado = await this.baseDatos.execute<{ borradas: number }>(
      sql`select core.depurar_auditoria(${meses}) as borradas`,
    );
    return resultado.rows[0]?.borradas ?? 0;
  }
}
