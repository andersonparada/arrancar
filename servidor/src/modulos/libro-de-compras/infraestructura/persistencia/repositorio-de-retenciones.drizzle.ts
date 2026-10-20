import { and, eq, gt, sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { aCentavos } from '../../../core/compartido/dominio/centavos.js';
import type {
  CambioDeResolucion,
  RepositorioDeRetenciones,
  RetencionPracticada,
  RetencionesDeUnDocumento,
} from '../../aplicacion/puertos/puertos-de-retenciones.js';
import type { ConstanciaAnotada } from '../../dominio/retenciones/constancia-de-retencion.js';
import type { ReglaDeRetencion } from '../../dominio/retencion-propuesta.js';
import { retenciones } from './retenciones.tablas.js';

/** Cambia constancias y resoluciones; la tabla tiene seguridad por empresa (RLS). */
export class RepositorioDeRetencionesDrizzle implements RepositorioDeRetenciones {
  async anotarConstancia(id: string, constancia: ConstanciaAnotada | null): Promise<void> {
    await transaccionEnCurso()
      .update(retenciones)
      .set({ constanciaNumero: constancia?.numero ?? null, constanciaFecha: constancia?.fecha ?? null })
      .where(eq(retenciones.id, id));
  }

  async resolver(id: string, { resolucion, nota, resueltaPor }: CambioDeResolucion): Promise<void> {
    const pendiente = resolucion === 'pendiente';
    await transaccionEnCurso()
      .update(retenciones)
      .set({
        resolucion,
        notaDeResolucion: pendiente ? null : nota,
        resueltaEn: pendiente ? null : sql`now()`,
        resueltaPor: pendiente ? null : resueltaPor,
      })
      .where(eq(retenciones.id, id));
  }
}

/** Lo que Anular y Eliminar documento necesitan de las retenciones del documento. */
export class RetencionesDeUnDocumentoDrizzle implements RetencionesDeUnDocumento {
  async practicadas(documentoId: string): Promise<RetencionPracticada[]> {
    const filas = await transaccionEnCurso()
      .select()
      .from(retenciones)
      .where(and(eq(retenciones.documentoId, documentoId), gt(retenciones.monto, '0')));
    return filas.map((fila) => ({
      regla: fila.regla as ReglaDeRetencion,
      fecha: fila.fecha,
      monto: aCentavos(fila.monto),
      conConstancia: fila.constanciaNumero !== null,
    }));
  }

  async dejarPorResolver(documentoId: string): Promise<number> {
    const filas = await transaccionEnCurso()
      .update(retenciones)
      .set({ resolucion: 'pendiente', notaDeResolucion: null, resueltaEn: null, resueltaPor: null })
      .where(and(eq(retenciones.documentoId, documentoId), gt(retenciones.monto, '0')))
      .returning({ id: retenciones.id });
    return filas.length;
  }
}
