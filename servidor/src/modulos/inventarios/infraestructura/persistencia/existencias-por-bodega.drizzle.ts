import { and, eq, sql } from 'drizzle-orm';
import { deLaTransaccion } from '../../../core/base-datos/columnas.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { deDiezmilesimas } from '../../dominio/decimales.js';
import type { CambioDeExistencia, ExistenciasPorBodega } from '../../aplicacion/puertos/existencias-por-bodega.js';
import { existencias, SIN_LOTE } from './existencias.tablas.js';

const claveDe = (c: CambioDeExistencia): string => `${c.bodegaId}|${c.articuloId}|${c.loteId ?? SIN_LOTE}`;

/** Suma los cambios de una misma bodega, artículo y lote: así una fila se toca una sola vez por documento. */
function juntar(cambios: readonly CambioDeExistencia[]): CambioDeExistencia[] {
  const porClave = new Map<string, CambioDeExistencia>();
  for (const cambio of cambios) {
    const antes = porClave.get(claveDe(cambio));
    porClave.set(claveDe(cambio), antes ? { ...cambio, cantidad: antes.cantidad + cambio.cantidad } : cambio);
  }
  return [...porClave.values()];
}

/**
 * La tabla tiene seguridad por empresa y por bodega: solo se escribe en las bodegas que el usuario ve. Una cantidad que
 * quedara negativa la rechaza el `check` de la tabla (la revisión de las líneas del tiempo ya la habría detenido antes).
 *
 * Primero se intenta sumar a la fila que existe y solo si no hay se inserta: `insert … on conflict` revisa el `check`
 * con la cantidad que se inserta (negativa en una salida) antes de mirar el conflicto, y fallaría.
 */
export class ExistenciasPorBodegaDrizzle implements ExistenciasPorBodega {
  async mover(cambios: readonly CambioDeExistencia[]): Promise<void> {
    for (const cambio of juntar(cambios)) {
      const cantidad = deDiezmilesimas(cambio.cantidad);
      const actualizadas = await this.sumar(cambio, cantidad);
      if (actualizadas === 0) await this.crear(cambio, cantidad);
    }
  }

  private async sumar(cambio: CambioDeExistencia, cantidad: string): Promise<number> {
    const filas = await transaccionEnCurso()
      .update(existencias)
      .set({ cantidad: sql`${existencias.cantidad} + ${cantidad}::numeric`, actualizadoEn: new Date() })
      .where(
        and(
          eq(existencias.bodegaId, cambio.bodegaId),
          eq(existencias.articuloId, cambio.articuloId),
          eq(existencias.loteClave, cambio.loteId ?? SIN_LOTE),
        ),
      )
      .returning({ bodegaId: existencias.bodegaId });
    return filas.length;
  }

  private async crear(cambio: CambioDeExistencia, cantidad: string): Promise<void> {
    await transaccionEnCurso()
      .insert(existencias)
      .values({
        empresaId: deLaTransaccion.empresa(),
        bodegaId: cambio.bodegaId,
        articuloId: cambio.articuloId,
        loteId: cambio.loteId,
        loteClave: cambio.loteId ?? SIN_LOTE,
        cantidad,
      });
  }
}
