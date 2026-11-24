import { and, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioValoresDeInmueble } from '../../aplicacion/puertos/valores-de-inmueble.js';
import type { InmuebleId } from '../../dominio/inmueble.js';
import type { FuenteDeValor } from '../../dominio/tipos-de-valor-de-inmueble.js';
import type { ValorDeInmueble } from '../../dominio/valor-de-inmueble.js';
import { mapeadorDeValorDeInmueble } from './valor-de-inmueble.mapeador.js';
import { valoresDeInmueble } from './valores-de-inmueble.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioValoresDeInmuebleDrizzle implements RepositorioValoresDeInmueble {
  async agregar(valor: ValorDeInmueble): Promise<void> {
    await transaccionEnCurso().insert(valoresDeInmueble).values(mapeadorDeValorDeInmueble.aFila(valor));
  }

  async eliminar(valorId: string): Promise<void> {
    await transaccionEnCurso().delete(valoresDeInmueble).where(eq(valoresDeInmueble.id, valorId));
  }

  async existe(datos: { inmuebleId: InmuebleId; fuente: FuenteDeValor; vigenteDesde: string }): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ id: valoresDeInmueble.id })
      .from(valoresDeInmueble)
      .where(
        and(
          eq(valoresDeInmueble.inmuebleId, datos.inmuebleId.valor),
          eq(valoresDeInmueble.fuente, datos.fuente),
          eq(valoresDeInmueble.vigenteDesde, datos.vigenteDesde),
        ),
      );
    return fila !== undefined;
  }
}
