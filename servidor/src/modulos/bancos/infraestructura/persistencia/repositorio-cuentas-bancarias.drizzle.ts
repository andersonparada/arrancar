import { eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioCuentasBancarias } from '../../aplicacion/puertos/repositorio-cuentas-bancarias.js';
import type { CuentaBancaria, CuentaBancariaId } from '../../dominio/cuenta-bancaria.js';
import { mapeadorDeCuentaBancaria } from './cuenta-bancaria.mapeador.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioCuentasBancariasDrizzle implements RepositorioCuentasBancarias {
  async buscar(id: CuentaBancariaId): Promise<CuentaBancaria | null> {
    const [fila] = await transaccionEnCurso().select().from(cuentasBancarias).where(eq(cuentasBancarias.id, id.valor));
    return fila ? mapeadorDeCuentaBancaria.aEntidad(fila) : null;
  }

  async agregar(cuentaBancaria: CuentaBancaria): Promise<void> {
    await transaccionEnCurso().insert(cuentasBancarias).values(mapeadorDeCuentaBancaria.aFila(cuentaBancaria));
  }

  async guardar(cuentaBancaria: CuentaBancaria): Promise<void> {
    await transaccionEnCurso()
      .update(cuentasBancarias)
      .set(mapeadorDeCuentaBancaria.aFila(cuentaBancaria))
      .where(eq(cuentasBancarias.id, cuentaBancaria.id.valor));
  }
}
