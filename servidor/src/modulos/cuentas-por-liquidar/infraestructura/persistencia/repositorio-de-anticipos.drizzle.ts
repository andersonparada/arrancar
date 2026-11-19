import { eq, or } from 'drizzle-orm';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AnticipoNuevo,
  AnulacionDeAnticipo,
  RepositorioDeAnticipos,
} from '../../aplicacion/puertos/puertos-de-anticipos.js';
import type { Anticipo } from '../../dominio/anticipos.js';
import { anticipos } from './anticipos.tablas.js';

type Fila = typeof anticipos.$inferSelect;

/** Lo que se escribe al entregar el anticipo. */
const entrega = (fila: Fila) => ({
  id: fila.id,
  numero: fila.numero,
  anioDeNumero: fila.anioDeNumero,
  beneficiarioId: fila.beneficiarioId,
  beneficiario: fila.beneficiario,
  esEmpleado: fila.esEmpleado,
  beneficiarioUsuarioId: fila.beneficiarioUsuarioId,
  clase: fila.clase,
  descripcion: fila.descripcion,
  localidadId: fila.localidadId,
  fecha: fila.fecha,
  fechaLimite: fila.fechaLimite,
  montoCentavos: aCentavos(fila.monto),
  forma: fila.forma,
  movimientoId: fila.movimientoId,
  motivoConVencidos: fila.motivoConVencidos,
});

/** Lo que se escribe al liquidar o anular. */
const cierre = (fila: Fila) => ({
  estado: fila.estado,
  fechaDeLiquidacion: fila.fechaDeLiquidacion,
  devueltoCentavos: aCentavos(fila.devuelto),
  movimientoDeDevolucionId: fila.movimientoDeDevolucionId,
  reembolsadoCentavos: aCentavos(fila.reembolsado),
  movimientoDeReembolsoId: fila.movimientoDeReembolsoId,
  noLiquidadoCentavos: aCentavos(fila.noLiquidado),
  destinoDeNoLiquidado: fila.destinoDeNoLiquidado,
  cuotas: fila.cuotas,
  motivoDeNoLiquidado: fila.motivoDeNoLiquidado,
  fechaDeAnulacion: fila.fechaDeAnulacion,
  motivoDeAnulacion: fila.motivoDeAnulacion,
});

/** La fila de la base como el anticipo del dominio. */
export const aAnticipo = (fila: Fila): Anticipo => ({ ...entrega(fila), ...cierre(fila) });

/** Las tablas tienen seguridad por empresa (RLS). */
export class RepositorioDeAnticiposDrizzle implements RepositorioDeAnticipos {
  async agregar({ montoCentavos, ...anticipo }: AnticipoNuevo): Promise<void> {
    const { empresaId } = contextoEnCurso();
    await transaccionEnCurso()
      .insert(anticipos)
      .values({ ...anticipo, empresaId, monto: deCentavos(montoCentavos) });
  }

  async buscar(id: string): Promise<Anticipo | null> {
    const [fila] = await transaccionEnCurso().select().from(anticipos).where(eq(anticipos.id, id));
    return fila ? aAnticipo(fila) : null;
  }

  async bloquear(id: string): Promise<Anticipo | null> {
    const [fila] = await transaccionEnCurso().select().from(anticipos).where(eq(anticipos.id, id)).for('update');
    return fila ? aAnticipo(fila) : null;
  }

  async delMovimiento(movimientoId: string): Promise<Anticipo | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(anticipos)
      .where(
        or(
          eq(anticipos.movimientoId, movimientoId),
          eq(anticipos.movimientoDeDevolucionId, movimientoId),
          eq(anticipos.movimientoDeReembolsoId, movimientoId),
        ),
      );
    return fila ? aAnticipo(fila) : null;
  }

  async anular(id: string, { anuladoPor, motivo, fechaDeAnulacion }: AnulacionDeAnticipo): Promise<void> {
    await transaccionEnCurso()
      .update(anticipos)
      .set({ estado: 'anulado', anuladoEn: new Date(), anuladoPor, motivoDeAnulacion: motivo, fechaDeAnulacion })
      .where(eq(anticipos.id, id));
  }
}
