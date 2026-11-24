import { asc } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';

/** Las localidades que el operador ve, para elegirlas por nombre o por código en el Excel de las parcelas. */
export class ConsultasLocalidadesParaExcel {
  listar(): Promise<Array<{ id: string; nombre: string; codigo: string }>> {
    return transaccionEnCurso()
      .select({ id: localidades.id, nombre: localidades.nombre, codigo: localidades.codigo })
      .from(localidades)
      .orderBy(asc(localidades.nombre));
  }
}
