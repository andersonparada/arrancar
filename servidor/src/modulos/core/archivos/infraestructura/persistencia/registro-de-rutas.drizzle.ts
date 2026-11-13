import { sql } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { RegistroDeRutas } from '../../aplicacion/puertos/depuracion-de-archivos.js';

/**
 * La tarea corre sin empresa y `core.archivos` tiene RLS: pregunta a `core.rutas_de_archivos_registradas`
 * (migración 0023), que ve todas las empresas pero solo dice si cada ruta recibida existe.
 */
export class RegistroDeRutasDrizzle implements RegistroDeRutas {
  constructor(private readonly baseDatos: BaseDatos) {}

  async registradas(rutas: readonly string[]): Promise<ReadonlySet<string>> {
    if (rutas.length === 0) return new Set();
    const resultado = await this.baseDatos.execute<{ ruta: string }>(
      sql`select ruta from core.rutas_de_archivos_registradas(array[${sql.join(
        rutas.map((ruta) => sql`${ruta}`),
        sql`, `,
      )}]::text[]) as ruta`,
    );
    return new Set(resultado.rows.map((fila) => fila.ruta));
  }
}
