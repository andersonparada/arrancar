import { eq, type SQL } from 'drizzle-orm';
import {
  contextoEnCurso,
  transaccionEnCurso,
} from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { aCentavos, deCentavos } from '../../../core/compartido/dominio/centavos.js';
import type { RepositorioDeAplicaciones } from '../../aplicacion/puertos/puertos-de-documentos.js';
import type { AplicacionDeNota, DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
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

  hechasPorLaNota(notaId: string): Promise<AplicacionDeNota[]> {
    return this.deLa(eq(aplicacionesDeNotas.notaId, notaId));
  }

  recibidasPorElCargo(cargoId: string): Promise<AplicacionDeNota[]> {
    return this.deLa(eq(aplicacionesDeNotas.cargoId, cargoId));
  }

  async borrarDeLaNota(notaId: string): Promise<void> {
    await transaccionEnCurso().delete(aplicacionesDeNotas).where(eq(aplicacionesDeNotas.notaId, notaId));
  }

  async borrarDelCargo(cargoId: string): Promise<void> {
    await transaccionEnCurso().delete(aplicacionesDeNotas).where(eq(aplicacionesDeNotas.cargoId, cargoId));
  }

  private async deLa(condicion: SQL): Promise<AplicacionDeNota[]> {
    const filas = await transaccionEnCurso().select().from(aplicacionesDeNotas).where(condicion);
    return filas.map(({ notaId, cargoId, monto }) => ({ notaId, cargoId, montoCentavos: aCentavos(monto) }));
  }
}
