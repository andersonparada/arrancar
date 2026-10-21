import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { RepositorioDeAplicaciones } from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import type { AplicacionACargo } from '../../dominio/reparto-de-nota-de-credito.js';
import { aplicacionesDeNotas } from './aplicaciones-de-notas.tablas.js';

/** La tabla tiene seguridad por empresa (RLS). */
export class RepositorioDeAplicacionesDrizzle implements RepositorioDeAplicaciones {
  async agregar(nota: DocumentoPorPagar, aplicaciones: readonly AplicacionACargo[]): Promise<void> {
    const { empresaId } = contextoEnCurso();
    await transaccionEnCurso()
      .insert(aplicacionesDeNotas)
      .values(
        aplicaciones.map(({ cargoId, montoCentavos }) => ({
          empresaId,
          proveedorId: nota.proveedorId,
          notaId: nota.id,
          cargoId,
          monto: deCentavos(montoCentavos),
        })),
      );
  }
}
