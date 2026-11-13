import { eq } from 'drizzle-orm';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  AjusteNuevo,
  AnulacionDeAjuste,
  RepositorioDeAjustes,
} from '../../aplicacion/puertos/puertos-de-ajustes.js';
import type { AjusteDeSaldo, CausaDeAjuste } from '../../dominio/ajustes.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import { ajustesDeSaldo } from './ajustes-de-saldo.tablas.js';

/** La tabla tiene seguridad por empresa (RLS). */
export class RepositorioDeAjustesDrizzle implements RepositorioDeAjustes {
  async agregar(nota: DocumentoPorPagar, ajuste: AjusteNuevo): Promise<string> {
    const { empresaId } = contextoEnCurso();
    const [fila] = await transaccionEnCurso()
      .insert(ajustesDeSaldo)
      .values({
        empresaId,
        proveedorId: nota.proveedorId,
        documentoId: nota.id,
        monto: deCentavos(ajuste.montoCentavos),
        fecha: ajuste.fecha,
        causa: ajuste.causa,
        motivo: ajuste.motivo,
        referencia: ajuste.referencia,
      })
      .returning({ id: ajustesDeSaldo.id });
    return fila!.id;
  }

  async buscar(id: string): Promise<AjusteDeSaldo | null> {
    const [fila] = await transaccionEnCurso().select().from(ajustesDeSaldo).where(eq(ajustesDeSaldo.id, id));
    if (!fila) return null;
    return {
      id: fila.id,
      documentoId: fila.documentoId,
      montoCentavos: aCentavos(fila.monto),
      fecha: fila.fecha,
      causa: fila.causa as CausaDeAjuste,
      motivo: fila.motivo,
      referencia: fila.referencia,
      estado: fila.estado as AjusteDeSaldo['estado'],
      motivoDeAnulacion: fila.motivoDeAnulacion,
    };
  }

  async anular(id: string, { anuladoPor, motivo }: AnulacionDeAjuste): Promise<void> {
    await transaccionEnCurso()
      .update(ajustesDeSaldo)
      .set({ estado: 'anulado', anuladoEn: new Date(), anuladoPor, motivoDeAnulacion: motivo })
      .where(eq(ajustesDeSaldo.id, id));
  }
}
