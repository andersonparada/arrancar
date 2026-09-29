import { and, eq, ne } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioCuentasBancarias } from '../../aplicacion/puertos/repositorio-cuentas-bancarias.js';
import { NumeroDeCuentaRepetido, type CuentaBancaria, type CuentaBancariaId } from '../../dominio/cuenta-bancaria.js';
import { mapeadorDeCuentaBancaria } from './cuenta-bancaria.mapeador.js';
import { cuentasBancarias } from './cuentas-bancarias.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioCuentasBancariasDrizzle implements RepositorioCuentasBancarias {
  async buscar(id: CuentaBancariaId): Promise<CuentaBancaria | null> {
    const [fila] = await transaccionEnCurso().select().from(cuentasBancarias).where(eq(cuentasBancarias.id, id.valor));
    return fila ? mapeadorDeCuentaBancaria.aEntidad(fila) : null;
  }

  async agregar(cuentaBancaria: CuentaBancaria): Promise<void> {
    await this.exigirNumeroLibre(cuentaBancaria);
    await transaccionEnCurso().insert(cuentasBancarias).values(mapeadorDeCuentaBancaria.aFila(cuentaBancaria));
  }

  async guardar(cuentaBancaria: CuentaBancaria): Promise<void> {
    await this.exigirNumeroLibre(cuentaBancaria);
    await transaccionEnCurso()
      .update(cuentasBancarias)
      .set(mapeadorDeCuentaBancaria.aFila(cuentaBancaria))
      .where(eq(cuentasBancarias.id, cuentaBancaria.id.valor));
  }

  /** Ninguna otra cuenta del mismo banco puede tener el mismo número, sin contar guiones ni espacios. */
  private async exigirNumeroLibre(cuentaBancaria: CuentaBancaria): Promise<void> {
    const { id, bancoId, numero, numeroNormalizado } = cuentaBancaria.instantanea();
    const [repetida] = await transaccionEnCurso()
      .select({ id: cuentasBancarias.id })
      .from(cuentasBancarias)
      .where(
        and(
          eq(cuentasBancarias.bancoId, bancoId),
          eq(cuentasBancarias.numeroNormalizado, numeroNormalizado),
          ne(cuentasBancarias.id, id.valor),
        ),
      )
      .limit(1);
    if (repetida) throw new NumeroDeCuentaRepetido(numero);
  }
}
