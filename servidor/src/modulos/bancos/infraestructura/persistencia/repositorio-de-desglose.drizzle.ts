import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  LineaDeDesgloseGuardada,
  RepositorioDeDesglose,
} from '../../aplicacion/puertos/repositorio-de-desglose.js';
import { desgloseDeMovimientos } from './desglose-de-movimientos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS); la cascada de la llave borra las líneas con el movimiento. */
export class RepositorioDeDesgloseDrizzle implements RepositorioDeDesglose {
  async reemplazar(empresaId: string, movimientoId: string, lineas: LineaDeDesgloseGuardada[]): Promise<void> {
    const transaccion = transaccionEnCurso();
    await transaccion.delete(desgloseDeMovimientos).where(eq(desgloseDeMovimientos.movimientoId, movimientoId));
    if (lineas.length === 0) return;
    await transaccion
      .insert(desgloseDeMovimientos)
      .values(lineas.map((linea) => ({ ...linea, empresaId, movimientoId })));
  }
}
