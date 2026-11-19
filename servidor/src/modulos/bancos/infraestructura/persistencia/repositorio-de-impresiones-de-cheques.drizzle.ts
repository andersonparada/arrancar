import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type {
  NuevaImpresionDeCheque,
  RepositorioDeImpresionesDeCheques,
} from '../../aplicacion/puertos/impresion-de-cheques.js';
import { impresionesDeCheques } from './impresiones-de-cheques.tablas.js';

/** Solo agrega: la tabla no admite cambiar ni borrar (RLS). Quién imprime y cuándo lo pone la transacción. */
export class RepositorioDeImpresionesDeChequesDrizzle implements RepositorioDeImpresionesDeCheques {
  async agregar(impresion: NuevaImpresionDeCheque): Promise<void> {
    await transaccionEnCurso().insert(impresionesDeCheques).values(impresion);
  }
}
