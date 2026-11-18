import { asc, eq, type SQL } from 'drizzle-orm';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDeReintegro,
  RepositorioDeReintegros,
  ReintegroNuevo,
} from '../../aplicacion/puertos/puertos-de-reintegros.js';
import type { Reintegro } from '../../dominio/reintegros.js';
import { aplicacionesDeReintegros } from './aplicaciones-de-reintegros.tablas.js';
import { reintegros } from './reintegros.tablas.js';

const aReintegro = (
  fila: typeof reintegros.$inferSelect,
  lineas: Array<typeof aplicacionesDeReintegros.$inferSelect>,
): Reintegro => ({
  id: fila.id,
  proveedorId: fila.proveedorId,
  numero: fila.numero,
  anioDeNumero: fila.anioDeNumero,
  forma: fila.forma,
  fecha: fila.fecha,
  montoCentavos: aCentavos(fila.monto),
  movimientoId: fila.movimientoId,
  referencia: fila.referencia,
  observaciones: fila.observaciones,
  estado: fila.estado,
  fechaDeAnulacion: fila.fechaDeAnulacion,
  motivoDeAnulacion: fila.motivoDeAnulacion,
  notas: lineas.map(({ notaId, monto }) => ({ notaId, montoCentavos: aCentavos(monto) })),
});

/** Las tablas tienen seguridad por empresa (RLS). */
export class RepositorioDeReintegrosDrizzle implements RepositorioDeReintegros {
  async agregar({ notas, montoCentavos, ...reintegro }: ReintegroNuevo): Promise<void> {
    const { empresaId } = contextoEnCurso();
    await transaccionEnCurso()
      .insert(reintegros)
      .values({ ...reintegro, empresaId, monto: deCentavos(montoCentavos) });
    await transaccionEnCurso()
      .insert(aplicacionesDeReintegros)
      .values(
        notas.map((nota) => ({
          empresaId,
          proveedorId: reintegro.proveedorId,
          reintegroId: reintegro.id,
          notaId: nota.notaId,
          monto: deCentavos(nota.montoCentavos),
        })),
      );
  }

  buscar(id: string): Promise<Reintegro | null> {
    return this.leer(eq(reintegros.id, id), false);
  }

  bloquear(id: string): Promise<Reintegro | null> {
    return this.leer(eq(reintegros.id, id), true);
  }

  delMovimiento(movimientoId: string): Promise<Reintegro | null> {
    return this.leer(eq(reintegros.movimientoId, movimientoId), false);
  }

  async anular(id: string, { anuladoPor, motivo, fechaDeAnulacion }: AnulacionDeReintegro): Promise<void> {
    await transaccionEnCurso()
      .update(reintegros)
      .set({ estado: 'anulado', anuladoEn: new Date(), anuladoPor, motivoDeAnulacion: motivo, fechaDeAnulacion })
      .where(eq(reintegros.id, id));
    await transaccionEnCurso()
      .update(aplicacionesDeReintegros)
      .set({ vigente: false })
      .where(eq(aplicacionesDeReintegros.reintegroId, id));
  }

  /** El reintegro que cumple la condición, con sus líneas; con `bloquear`, deja su fila para este caso de uso. */
  private async leer(condicion: SQL, bloquear: boolean): Promise<Reintegro | null> {
    const consulta = transaccionEnCurso().select().from(reintegros).where(condicion);
    const [fila] = await (bloquear ? consulta.for('update') : consulta);
    if (!fila) return null;
    const lineas = await transaccionEnCurso()
      .select()
      .from(aplicacionesDeReintegros)
      .where(eq(aplicacionesDeReintegros.reintegroId, fila.id))
      .orderBy(asc(aplicacionesDeReintegros.notaId));
    return aReintegro(fila, lineas);
  }
}
