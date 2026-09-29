import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioDepartamentos } from '../../aplicacion/puertos/repositorio-departamentos.js';
import type { Departamento, DepartamentoId } from '../../dominio/departamento.js';
import { mapeadorDeDepartamento } from './departamento.mapeador.js';
import { departamentos } from './departamentos.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioDepartamentosDrizzle implements RepositorioDepartamentos {
  async buscar(id: DepartamentoId): Promise<Departamento | null> {
    const [fila] = await transaccionEnCurso().select().from(departamentos).where(eq(departamentos.id, id.valor));
    return fila ? mapeadorDeDepartamento.aEntidad(fila) : null;
  }

  async agregar(departamento: Departamento): Promise<void> {
    await transaccionEnCurso().insert(departamentos).values(mapeadorDeDepartamento.aFila(departamento));
  }

  async guardar(departamento: Departamento): Promise<void> {
    await transaccionEnCurso()
      .update(departamentos)
      .set(mapeadorDeDepartamento.aFila(departamento))
      .where(eq(departamentos.id, departamento.id.valor));
  }

  async eliminar(departamento: Departamento): Promise<void> {
    await transaccionEnCurso().delete(departamentos).where(eq(departamentos.id, departamento.id.valor));
  }
}
