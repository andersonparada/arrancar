import { eq, sql } from 'drizzle-orm';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDeLaReposicion,
  ReposicionNueva,
  RepositorioDeReposiciones,
} from '../../aplicacion/puertos/puertos-de-reposiciones.js';
import type { LineaDeReposicion, Reposicion } from '../../dominio/reposiciones.js';
import { reposicionComprobantes } from './reposicion-comprobantes.tablas.js';
import { reposiciones } from './reposiciones.tablas.js';

/** La fila de la base como la reposición del dominio (sin marcas de tiempo ni autoría). */
export function aReposicion(fila: typeof reposiciones.$inferSelect): Reposicion {
  return {
    id: fila.id,
    fondoId: fila.fondoId,
    numero: fila.numero,
    anioDeNumero: fila.anioDeNumero,
    fecha: fila.fecha,
    forma: fila.forma,
    montoCentavos: aCentavos(fila.monto),
    movimientoId: fila.movimientoId,
    custodio: fila.custodio,
    laHizoElCustodio: fila.laHizoElCustodio,
    estado: fila.estado,
    fechaDeAnulacion: fila.fechaDeAnulacion,
    motivoDeAnulacion: fila.motivoDeAnulacion,
  };
}

/** Las tablas tienen seguridad por empresa y por el alcance de fondos (RLS): un fondo ajeno no se ve ni se toca. */
export class RepositorioDeReposicionesDrizzle implements RepositorioDeReposiciones {
  async agregar({ lineas, montoCentavos, ...nueva }: ReposicionNueva): Promise<void> {
    const { empresaId } = contextoEnCurso();
    const transaccion = transaccionEnCurso();
    await transaccion.insert(reposiciones).values({ ...nueva, empresaId, monto: deCentavos(montoCentavos) });
    await transaccion.insert(reposicionComprobantes).values(
      lineas.map((linea) => ({
        reposicionId: nueva.id,
        comprobanteId: linea.comprobanteId,
        empresaId,
        fondoId: nueva.fondoId,
        monto: deCentavos(linea.montoCentavos),
      })),
    );
  }

  async buscar(id: string): Promise<Reposicion | null> {
    const [fila] = await transaccionEnCurso().select().from(reposiciones).where(eq(reposiciones.id, id));
    return fila ? aReposicion(fila) : null;
  }

  async bloquear(id: string): Promise<Reposicion | null> {
    const [fila] = await transaccionEnCurso().select().from(reposiciones).where(eq(reposiciones.id, id)).for('update');
    return fila ? aReposicion(fila) : null;
  }

  async delMovimiento(movimientoId: string): Promise<Reposicion | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(reposiciones)
      .where(eq(reposiciones.movimientoId, movimientoId));
    return fila ? aReposicion(fila) : null;
  }

  async lineas(reposicionId: string): Promise<LineaDeReposicion[]> {
    const filas = await transaccionEnCurso()
      .select({ comprobanteId: reposicionComprobantes.comprobanteId, monto: reposicionComprobantes.monto })
      .from(reposicionComprobantes)
      .where(eq(reposicionComprobantes.reposicionId, reposicionId));
    return filas.map(({ comprobanteId, monto }) => ({ comprobanteId, montoCentavos: aCentavos(monto) }));
  }

  async anular(id: string, { anuladoPor, motivo, fechaDeAnulacion }: AnulacionDeLaReposicion): Promise<void> {
    const transaccion = transaccionEnCurso();
    await transaccion
      .update(reposiciones)
      .set({ estado: 'anulada', anuladoEn: sql`now()`, anuladoPor, motivoDeAnulacion: motivo, fechaDeAnulacion })
      .where(eq(reposiciones.id, id));
    await transaccion
      .update(reposicionComprobantes)
      .set({ vigente: false })
      .where(eq(reposicionComprobantes.reposicionId, id));
  }
}
