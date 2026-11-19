import { desc, eq, sql } from 'drizzle-orm';
import type { BaseDatos } from '../../../base-datos/conexion.js';
import { usuarios } from '../../../identidad/infraestructura/persistencia/usuarios.tablas.js';
import { nombreCompleto } from '../../../identidad/infraestructura/persistencia/consultas-usuarios.drizzle.js';
import type { EntradaDeBitacoraDto } from '../../aplicacion/dto/entrada-de-bitacora.dto.js';
import type { Bitacora, NuevaEntrada } from '../../aplicacion/puertos/bitacora.js';
import { bitacoraSuperacceso } from './bitacora.tablas.js';

/**
 * Sin RLS ni unidad de trabajo: la usa soporte, que trabaja por encima de las
 * cuentas, y se escribe aunque la operación que la origina no sea de una empresa.
 */
export class BitacoraDrizzle implements Bitacora {
  constructor(private readonly bd: BaseDatos) {}

  async registrar(entrada: NuevaEntrada): Promise<void> {
    await this.bd.insert(bitacoraSuperacceso).values(entrada);
  }

  async recientes(limite: number): Promise<EntradaDeBitacoraDto[]> {
    const entradas = await this.bd
      .select({
        id: bitacoraSuperacceso.id,
        accion: bitacoraSuperacceso.accion,
        detalle: bitacoraSuperacceso.detalle,
        direccionIp: bitacoraSuperacceso.direccionIp,
        creadoEn: bitacoraSuperacceso.creadoEn,
        usuarioNombre: nombreCompleto,
        empresaId: bitacoraSuperacceso.empresaId,
      })
      .from(bitacoraSuperacceso)
      .innerJoin(usuarios, eq(usuarios.id, bitacoraSuperacceso.usuarioId))
      .orderBy(desc(bitacoraSuperacceso.creadoEn))
      .limit(limite);
    const nombres = await this.nombresDe(entradas.map((entrada) => entrada.empresaId));
    return entradas.map(({ empresaId, ...entrada }) => ({
      ...entrada,
      empresaNombre: empresaId ? (nombres.get(empresaId) ?? null) : null,
    }));
  }

  /** Pasa por `core.nombres_de_empresas`: la lectura de `core.empresas` solo alcanza la cuenta de la transacción. */
  private async nombresDe(empresaIds: (string | null)[]): Promise<Map<string, string>> {
    const ids = [...new Set(empresaIds.filter((id): id is string => id !== null))];
    if (ids.length === 0) return new Map();
    const lista = sql.join(
      ids.map((id) => sql`${id}::uuid`),
      sql`, `,
    );
    const { rows } = await this.bd.execute<{ id: string; nombre: string }>(
      sql`select * from core.nombres_de_empresas(array[${lista}])`,
    );
    return new Map(rows.map((fila) => [fila.id, fila.nombre]));
  }
}
