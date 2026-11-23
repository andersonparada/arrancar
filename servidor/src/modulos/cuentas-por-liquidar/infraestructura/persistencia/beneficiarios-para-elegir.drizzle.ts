import { asc, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { terceros } from '../../../terceros/infraestructura/persistencia/terceros.tablas.js';
import type { BeneficiarioParaElegir, BeneficiariosParaElegir } from '../../aplicacion/puertos/puertos-de-opciones.js';

/** Los terceros activos de la cuenta, por nombre (lectura; RLS por cuenta). */
export class BeneficiariosParaElegirDrizzle implements BeneficiariosParaElegir {
  listarActivos(): Promise<BeneficiarioParaElegir[]> {
    return transaccionEnCurso()
      .select({ id: terceros.id, nombreMostrar: terceros.nombreMostrar, nit: terceros.nit, activo: terceros.activo })
      .from(terceros)
      .where(eq(terceros.activo, true))
      .orderBy(asc(terceros.nombreMostrar));
  }
}
