import { eq } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type {
  DatosDeLaEmpresaParaElAviso,
  EmpresaDelAviso,
} from '../../aplicacion/puertos/puertos-de-avisos-de-pago.js';

/** El nombre y el correo de la empresa activa, de `core.empresas`, en la transacción en curso. */
export class EmpresaDelAvisoDrizzle implements DatosDeLaEmpresaParaElAviso {
  async obtener({ empresaId }: Operador): Promise<EmpresaDelAviso> {
    const [fila] = await transaccionEnCurso()
      .select({ nombre: empresas.nombre, correo: empresas.correo })
      .from(empresas)
      .where(eq(empresas.id, empresaId));
    if (!fila) throw new RecursoNoEncontrado('La empresa');
    return fila;
  }
}
