import { asc, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';

/** Una localidad a la que se puede asignar una bodega. */
export interface LocalidadParaBodega {
  id: string;
  codigo: string;
  nombre: string;
}

/**
 * Las localidades activas que el usuario ve, para elegirlas al importar bodegas desde Excel (lectura de la tabla del
 * módulo esencial Empresas). La seguridad por filas oculta las de otras empresas y las que el usuario no tiene.
 */
export class LocalidadesParaBodegasDrizzle {
  listar(): Promise<LocalidadParaBodega[]> {
    return transaccionEnCurso()
      .select({ id: localidades.id, codigo: localidades.codigo, nombre: localidades.nombre })
      .from(localidades)
      .where(eq(localidades.activo, true))
      .orderBy(asc(localidades.nombre));
  }
}
