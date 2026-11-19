import { asc, sql } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import type { CuentaDto } from '../../aplicacion/dto/cuenta.dto.js';
import type { ConsultasCuentas } from '../../aplicacion/puertos/repositorio-cuentas.js';
import { cuentas } from './cuentas.tablas.js';

/** El conteo de empresas sale de `core.resumen_de_cuentas()`: soporte trabaja sin cuenta en la transacción. */
export class ConsultasCuentasDrizzle implements ConsultasCuentas {
  constructor(private readonly bd: BaseDatos) {}

  async listar(): Promise<CuentaDto[]> {
    const lista = await this.bd.select().from(cuentas).orderBy(asc(cuentas.nombre));
    const { rows } = await this.bd.execute<{ cuenta_id: string; total_empresas: number }>(
      sql`select * from core.resumen_de_cuentas()`,
    );
    const totales = new Map(rows.map((fila) => [fila.cuenta_id, fila.total_empresas]));
    return lista.map(({ id, nombre, activa, creadoEn }) => ({
      id,
      nombre,
      activa,
      creadoEn,
      totalEmpresas: totales.get(id) ?? 0,
    }));
  }
}
