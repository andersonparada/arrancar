import { and, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import { empresas } from '../../../core/cuentas/infraestructura/persistencia/empresas.tablas.js';
import type { RepositorioEmpresas } from '../../aplicacion/puertos/repositorio-empresas.js';
import type { CuentaId } from '../../../core/compartido/dominio/identificador.js';
import type { Empresa, EmpresaId } from '../../dominio/empresa.js';
import { mapeadorDeEmpresa } from './empresa.mapeador.js';

/**
 * `core.empresas` no tiene seguridad por filas (es la tabla que define los
 * inquilinos), así que cada búsqueda filtra por cuenta de forma explícita.
 */
export class RepositorioEmpresasDrizzle implements RepositorioEmpresas {
  async buscarEnCuenta(id: EmpresaId, cuentaId: CuentaId): Promise<Empresa | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(empresas)
      .where(and(eq(empresas.id, id.valor), eq(empresas.cuentaId, cuentaId.valor)));
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
