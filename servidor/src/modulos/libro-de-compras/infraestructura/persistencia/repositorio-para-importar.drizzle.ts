import { eq, inArray } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioParaImportar } from '../../aplicacion/puertos/puertos-de-importacion.js';
import type { DteRecibido } from '../../dominio/dte-recibido.js';
import { mapeadorDeDteRecibido } from './dte-recibido.mapeador.js';
import { dteRecibidos } from './dte-recibidos.tablas.js';

/** Un archivo de 10,000 filas se lee y se escribe en tandas de este tamaño. */
const TAMANO_DE_TANDA = 500;

function tandas<T>(elementos: readonly T[]): T[][] {
  const resultado: T[][] = [];
  for (let i = 0; i < elementos.length; i += TAMANO_DE_TANDA) resultado.push(elementos.slice(i, i + TAMANO_DE_TANDA));
  return resultado;
}

/** Las escrituras en lote de la bandeja. La tabla tiene seguridad por empresa (RLS): nada filtra por empresa. */
export class RepositorioParaImportarDrizzle implements RepositorioParaImportar {
  async existentes(autorizaciones: readonly string[]): Promise<Map<string, DteRecibido>> {
    const resultado = new Map<string, DteRecibido>();
    for (const tanda of tandas(autorizaciones)) {
      const filas = await transaccionEnCurso()
        .select()
        .from(dteRecibidos)
        .where(inArray(dteRecibidos.autorizacionFel, tanda))
        .for('update');
      for (const fila of filas) resultado.set(fila.autorizacionFel, mapeadorDeDteRecibido.aEntidad(fila));
    }
    return resultado;
  }

  async agregarVarias(filas: readonly DteRecibido[]): Promise<void> {
    for (const tanda of tandas(filas)) {
      await transaccionEnCurso()
        .insert(dteRecibidos)
        .values(tanda.map((fila) => mapeadorDeDteRecibido.aFila(fila)));
    }
  }

  async actualizarDatosDeLaSat(fila: DteRecibido): Promise<void> {
    await transaccionEnCurso()
      .update(dteRecibidos)
      .set(mapeadorDeDteRecibido.aDatosDeLaSat(fila))
      .where(eq(dteRecibidos.id, fila.id.valor));
  }

  async moverALote(ids: readonly string[], loteId: string): Promise<void> {
    for (const tanda of tandas(ids)) {
      await transaccionEnCurso().update(dteRecibidos).set({ loteId }).where(inArray(dteRecibidos.id, tanda));
    }
  }
}
