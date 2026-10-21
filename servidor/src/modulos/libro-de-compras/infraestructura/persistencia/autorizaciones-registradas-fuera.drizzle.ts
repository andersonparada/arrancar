import { sql } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { AutorizacionesRegistradasFuera } from '../../aplicacion/puertos/puertos-de-la-bandeja.js';

/**
 * Pregunta a la función `libro_de_compras.autorizacion_registrada_fuera` (`security definer`): responde solo sí o no y
 * solo por las demás empresas de la misma cuenta. Lo que esté en otra cuenta no se revela.
 */
export class AutorizacionesRegistradasFueraDrizzle implements AutorizacionesRegistradasFuera {
  async estaRegistrada(autorizacionFel: string): Promise<boolean> {
    const resultado = await transaccionEnCurso().execute<{ respuesta: boolean }>(
      sql`select libro_de_compras.autorizacion_registrada_fuera(${autorizacionFel}::uuid) as respuesta`,
    );
    return resultado.rows[0]?.respuesta === true;
  }
}
