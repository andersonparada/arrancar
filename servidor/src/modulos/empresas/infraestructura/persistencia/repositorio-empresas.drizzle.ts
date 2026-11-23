import { and, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { RepositorioEmpresas } from '../../aplicacion/puertos/repositorio-empresas.js';
import type { CuentaId } from '../../../core/compartido/dominio/identificador.js';
import type { Empresa, EmpresaId } from '../../dominio/empresa.js';
import { mapeadorDeEmpresa } from './empresa.mapeador.js';

/**
 * `core.empresas` solo se lee, se inserta y se cambia dentro de la cuenta de la transacción (RLS); aun así cada
 * búsqueda filtra por cuenta de forma explícita. Lo que la sesión necesita ver de otras cuentas pasa por funciones
 * `security definer`.
 */
export class RepositorioEmpresasDrizzle implements RepositorioEmpresas {
  /**
   * Bloquea la fila hasta el final de la transacción (`no key update`, como el UPDATE que seguirá): serializa a dos
   * editores sin frenar las inserciones de otras tablas que apuntan a la empresa (su `for key share`).
   */
  async buscarEnCuenta(id: EmpresaId, cuentaId: CuentaId): Promise<Empresa | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(empresas)
      .where(and(eq(empresas.id, id.valor), eq(empresas.cuentaId, cuentaId.valor)))
      .for('no key update');
    return fila ? mapeadorDeEmpresa.aEntidad(fila) : null;
  }

  async agregar(empresa: Empresa): Promise<void> {
    await transaccionEnCurso().insert(empresas).values(mapeadorDeEmpresa.aFila(empresa));
  }

  async actualizar(empresa: Empresa): Promise<void> {
    const { id, cuentaId, ...cambios } = mapeadorDeEmpresa.aFila(empresa);
    await transaccionEnCurso()
      .update(empresas)
      .set(cambios)
      .where(and(eq(empresas.id, empresa.id.valor), eq(empresas.cuentaId, empresa.cuentaId.valor)));
  }
}
