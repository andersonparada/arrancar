import { eq, sql } from 'drizzle-orm';
import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { AjusteDeArqueoNuevo, ComprobantesDelArqueo } from '../../aplicacion/puertos/puertos-de-arqueos.js';
import type { AnulacionDelComprobante } from '../../aplicacion/puertos/puertos-de-comprobantes.js';
import type { Comprobante } from '../../dominio/comprobantes.js';
import { aComprobante, comprobantesConSuContexto } from './comprobantes.lectura.js';
import { comprobantes } from './comprobantes.tablas.js';

/** El faltante o sobrante de un arqueo: un comprobante del fondo que lo repone o lo resta. RLS por empresa y alcance. */
export class ComprobantesDelArqueoDrizzle implements ComprobantesDelArqueo {
  async agregar(nuevo: AjusteDeArqueoNuevo): Promise<string> {
    const { empresaId } = contextoEnCurso();
    const { montoCentavos, ...datos } = nuevo;
    const [fila] = await transaccionEnCurso()
      .insert(comprobantes)
      .values({
        ...datos,
        empresaId,
        monto: deCentavos(montoCentavos),
        resta: nuevo.clase === 'sobrante',
        asignadoEn: sql`now()`,
      })
      .returning({ id: comprobantes.id });
    return fila!.id;
  }

  async delArqueo(arqueoId: string): Promise<Comprobante | null> {
    const [fila] = await comprobantesConSuContexto().where(eq(comprobantes.arqueoId, arqueoId));
    return fila ? aComprobante(fila) : null;
  }

  /** Bloquea la fila sola y luego la lee con sus uniones (`FOR UPDATE OF` no admite el nombre con esquema). */
  async bloquearDelArqueo(arqueoId: string): Promise<Comprobante | null> {
    const bloqueada = await transaccionEnCurso()
      .select({ id: comprobantes.id })
      .from(comprobantes)
      .where(eq(comprobantes.arqueoId, arqueoId))
      .for('update');
    return bloqueada.length === 0 ? null : this.delArqueo(arqueoId);
  }

  async anular(id: string, anulacion: AnulacionDelComprobante): Promise<void> {
    await transaccionEnCurso()
      .update(comprobantes)
      .set({
        estado: 'anulado',
        anuladoEn: sql`now()`,
        anuladoPor: anulacion.anuladoPor,
        motivoDeAnulacion: anulacion.motivo,
        fechaDeAnulacion: anulacion.fechaDeAnulacion,
      })
      .where(eq(comprobantes.id, id));
  }
}
