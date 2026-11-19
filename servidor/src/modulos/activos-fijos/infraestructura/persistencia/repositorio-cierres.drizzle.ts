import { and, desc, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { CierreNuevo, Reapertura, RepositorioCierres } from '../../aplicacion/puertos/repositorio-cierres.js';
import type { CierreGuardado } from '../../dominio/depreciacion/cierre-guardado.js';
import { cierres } from './cierres.tablas.js';
import { mapeadorDeCierre } from './cierre.mapeador.js';
import { cuotas } from './cuotas.tablas.js';
import { enTandas } from './en-tandas.js';

/** Las tablas tienen seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioCierresDrizzle implements RepositorioCierres {
  async buscar(periodo: string): Promise<CierreGuardado | null> {
    const [fila] = await transaccionEnCurso().select().from(cierres).where(eq(cierres.periodo, periodo));
    return fila ? mapeadorDeCierre.aCierre(fila) : null;
  }

  async listar(): Promise<CierreGuardado[]> {
    const filas = await transaccionEnCurso().select().from(cierres).orderBy(desc(cierres.periodo));
    return filas.map((fila) => mapeadorDeCierre.aCierre(fila));
  }

  async guardar(nuevo: CierreNuevo): Promise<void> {
    const transaccion = transaccionEnCurso();
    const datos = mapeadorDeCierre.aFila(nuevo);
    await transaccion
      .insert(cierres)
      .values({ empresaId: nuevo.empresaId, periodo: nuevo.periodo, ...datos })
      .onConflictDoUpdate({ target: [cierres.empresaId, cierres.periodo], set: datos });
    for (const tanda of enTandas(nuevo.cuotas)) {
      await transaccion
        .insert(cuotas)
        .values(tanda.map((cuota) => mapeadorDeCierre.aFilaDeCuota(nuevo.empresaId, nuevo.periodo, cuota)));
    }
  }

  async reabrir({ periodo, usuarioId, ahora, motivo }: Reapertura): Promise<void> {
    const transaccion = transaccionEnCurso();
    await transaccion
      .update(cuotas)
      .set({ vigente: false })
      .where(and(eq(cuotas.periodo, periodo), eq(cuotas.vigente, true)));
    await transaccion
      .update(cierres)
      .set({ estado: 'reabierto', reabiertoEn: ahora, reabiertoPor: usuarioId, motivoDeReapertura: motivo })
      .where(eq(cierres.periodo, periodo));
  }
}
