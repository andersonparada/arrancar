import { asc, desc, eq, sql } from 'drizzle-orm';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnulacionDelVale,
  ConsultasDeVales,
  LiquidacionDelVale,
  RepositorioDeVales,
  ValeNuevo,
} from '../../aplicacion/puertos/puertos-de-vales.js';
import type { Comprobante } from '../../dominio/comprobantes.js';
import type { ValeProvisional } from '../../dominio/vales-provisionales.js';
import { aComprobante, comprobantesConSuContexto } from './comprobantes.lectura.js';
import { comprobantes } from './comprobantes.tablas.js';
import { valesProvisionales } from './vales-provisionales.tablas.js';

/** La fila de la base como el vale del dominio (sin marcas de tiempo ni autoría). */
export function aVale(fila: typeof valesProvisionales.$inferSelect): ValeProvisional {
  return {
    id: fila.id,
    fondoId: fila.fondoId,
    numero: fila.numero,
    anioDeNumero: fila.anioDeNumero,
    fecha: fila.fecha,
    entregadoA: fila.entregadoA,
    entregadoAUsuarioId: fila.entregadoAUsuarioId,
    montoCentavos: aCentavos(fila.monto),
    motivo: fila.motivo,
    estado: fila.estado,
    fechaDeLiquidacion: fila.fechaDeLiquidacion,
    devueltoCentavos: aCentavos(fila.devuelto),
    fechaDeAnulacion: fila.fechaDeAnulacion,
    motivoDeAnulacion: fila.motivoDeAnulacion,
  };
}

/** Las tablas tienen seguridad por empresa y por el alcance de fondos (RLS): un fondo ajeno no se ve ni se toca. */
export class RepositorioDeValesDrizzle implements RepositorioDeVales {
  async agregar(nuevo: ValeNuevo): Promise<string> {
    const { empresaId } = contextoEnCurso();
    const { montoCentavos, ...datos } = nuevo;
    const [fila] = await transaccionEnCurso()
      .insert(valesProvisionales)
      .values({ ...datos, empresaId, monto: deCentavos(montoCentavos) })
      .returning({ id: valesProvisionales.id });
    return fila!.id;
  }

  async buscar(id: string): Promise<ValeProvisional | null> {
    const [fila] = await transaccionEnCurso().select().from(valesProvisionales).where(eq(valesProvisionales.id, id));
    return fila ? aVale(fila) : null;
  }

  async bloquear(id: string): Promise<ValeProvisional | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(valesProvisionales)
      .where(eq(valesProvisionales.id, id))
      .for('update');
    return fila ? aVale(fila) : null;
  }

  async liquidar(
    id: string,
    { devueltoCentavos, fechaDeLiquidacion, liquidadoPor }: LiquidacionDelVale,
  ): Promise<void> {
    await transaccionEnCurso()
      .update(valesProvisionales)
      .set({
        estado: 'liquidado',
        devuelto: deCentavos(devueltoCentavos),
        fechaDeLiquidacion,
        liquidadoEn: sql`now()`,
        liquidadoPor,
      })
      .where(eq(valesProvisionales.id, id));
  }

  async anular(id: string, { anuladoPor, motivo, fechaDeAnulacion }: AnulacionDelVale): Promise<void> {
    await transaccionEnCurso()
      .update(valesProvisionales)
      .set({ estado: 'anulado', anuladoEn: sql`now()`, anuladoPor, motivoDeAnulacion: motivo, fechaDeAnulacion })
      .where(eq(valesProvisionales.id, id));
  }
}

/** Lecturas de los vales de un fondo y de los comprobantes con los que se liquidó cada uno. */
export class ConsultasDeValesDrizzle implements ConsultasDeVales {
  async delFondo(fondoId: string): Promise<ValeProvisional[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(valesProvisionales)
      .where(eq(valesProvisionales.fondoId, fondoId))
      .orderBy(desc(valesProvisionales.fecha), desc(valesProvisionales.numero));
    return filas.map(aVale);
  }

  async comprobantesDelVale(valeId: string): Promise<Comprobante[]> {
    const filas = await comprobantesConSuContexto()
      .where(eq(comprobantes.valeProvisionalId, valeId))
      .orderBy(asc(comprobantes.fecha), asc(comprobantes.creadoEn));
    return filas.map(aComprobante);
  }
}
