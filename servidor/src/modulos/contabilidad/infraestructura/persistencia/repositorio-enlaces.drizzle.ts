import { and, eq, isNull } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RolDeCuenta } from '../../../core/contratos/contabilidad.contratos.js';
import type { RepositorioEnlaces } from '../../aplicacion/puertos/enlaces.js';
import type { Enlace, EnlaceId } from '../../dominio/enlace.js';
import { mapeadorDeEnlace } from './enlace.mapeador.js';
import { enlaces } from './enlaces.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioEnlacesDrizzle implements RepositorioEnlaces {
  async buscar(id: EnlaceId): Promise<Enlace | null> {
    const [fila] = await transaccionEnCurso().select().from(enlaces).where(eq(enlaces.id, id.valor));
    return fila ? mapeadorDeEnlace.aEntidad(fila) : null;
  }

  async buscarParaCambiar(rol: RolDeCuenta, llave: string | null): Promise<Enlace | null> {
    const igualLlave = llave === null ? isNull(enlaces.llave) : eq(enlaces.llave, llave);
    const [fila] = await transaccionEnCurso()
      .select()
      .from(enlaces)
      .where(and(eq(enlaces.rol, rol), igualLlave))
      .for('update');
    return fila ? mapeadorDeEnlace.aEntidad(fila) : null;
  }

  async buscarParaQuitar(id: EnlaceId): Promise<Enlace | null> {
    const [fila] = await transaccionEnCurso().select().from(enlaces).where(eq(enlaces.id, id.valor)).for('update');
    return fila ? mapeadorDeEnlace.aEntidad(fila) : null;
  }

  async agregar(enlace: Enlace): Promise<void> {
    await transaccionEnCurso().insert(enlaces).values(mapeadorDeEnlace.aFila(enlace));
  }

  async guardar(enlace: Enlace): Promise<void> {
    await transaccionEnCurso()
      .update(enlaces)
      .set(mapeadorDeEnlace.aFila(enlace))
      .where(eq(enlaces.id, enlace.id.valor));
  }

  async eliminar(enlace: Enlace): Promise<void> {
    await transaccionEnCurso().delete(enlaces).where(eq(enlaces.id, enlace.id.valor));
  }
}
