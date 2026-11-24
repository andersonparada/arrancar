import { asc, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { inmuebles } from '../../../empresas/infraestructura/persistencia/inmuebles.tablas.js';
import { localidades } from '../../../empresas/infraestructura/persistencia/localidades.tablas.js';
import type { OpcionDeCatalogoDto } from '../../aplicacion/dto/catalogos.dto.js';
import type { ConsultasDeCatalogos } from '../../aplicacion/puertos/consultas-de-catalogos.js';

/** Lee de Empresas (solo sus tablas, con su seguridad por empresa y por localidad) lo que Parcelas ofrece para elegir. */
export class ConsultasDeCatalogosDrizzle implements ConsultasDeCatalogos {
  localidades(): Promise<OpcionDeCatalogoDto[]> {
    return transaccionEnCurso()
      .select({ id: localidades.id, nombre: localidades.nombre })
      .from(localidades)
      .where(eq(localidades.activo, true))
      .orderBy(asc(localidades.nombre));
  }

  inmuebles(): Promise<OpcionDeCatalogoDto[]> {
    return transaccionEnCurso()
      .select({ id: inmuebles.id, nombre: inmuebles.nombre })
      .from(inmuebles)
      .where(eq(inmuebles.activo, true))
      .orderBy(asc(inmuebles.nombre));
  }
}
