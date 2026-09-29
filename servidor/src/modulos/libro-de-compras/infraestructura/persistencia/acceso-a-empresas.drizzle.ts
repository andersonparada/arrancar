import { and, eq } from 'drizzle-orm';
import { RecursoNoEncontrado } from '../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresas, empresaUsuarios } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { AccesoAEmpresas } from '../../aplicacion/puertos/repositorios-de-datos-fiscales.js';

/**
 * Una empresa es del operador si es de su cuenta y, salvo soporte, él es miembro de ella. Lo que no cumple se
 * trata como inexistente, para no revelar que existe.
 */
export class AccesoAEmpresasDrizzle implements AccesoAEmpresas {
  async exigirAcceso(operador: Operador, empresaId: string): Promise<void> {
    const transaccion = transaccionEnCurso();
    const [empresa] = await transaccion
      .select({ id: empresas.id })
      .from(empresas)
      .where(and(eq(empresas.id, empresaId), eq(empresas.cuentaId, operador.cuentaId)));
    if (!empresa) throw new RecursoNoEncontrado('La empresa');
    if (operador.esSuperacceso) return;
    const [acceso] = await transaccion
      .select({ empresaId: empresaUsuarios.empresaId })
      .from(empresaUsuarios)
      .where(and(eq(empresaUsuarios.empresaId, empresaId), eq(empresaUsuarios.usuarioId, operador.usuarioId)));
    if (!acceso) throw new RecursoNoEncontrado('La empresa');
  }
}
