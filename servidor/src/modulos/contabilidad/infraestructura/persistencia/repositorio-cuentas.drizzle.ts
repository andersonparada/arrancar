import { count, eq } from 'drizzle-orm';
import { transaccionEnCurso } from '../../../core/compartido/infraestructura/unidad-de-trabajo-postgres.js';
import type { RepositorioCuentas } from '../../aplicacion/puertos/repositorio-cuentas.js';
import type { Cuenta, CuentaId } from '../../dominio/cuenta.js';
import { mapeadorDeCuenta } from './cuenta.mapeador.js';
import { cuentas } from './cuentas.tablas.js';
import { enlaces } from './enlaces.tablas.js';

/** La tabla tiene seguridad por empresa (RLS): ninguna consulta necesita filtrar por empresa. */
export class RepositorioCuentasDrizzle implements RepositorioCuentas {
  async buscar(id: CuentaId): Promise<Cuenta | null> {
    const [fila] = await transaccionEnCurso().select().from(cuentas).where(eq(cuentas.id, id.valor));
    return fila ? mapeadorDeCuenta.aEntidad(fila) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Cuenta | null> {
    const [fila] = await transaccionEnCurso().select().from(cuentas).where(eq(cuentas.codigo, codigo));
    return fila ? mapeadorDeCuenta.aEntidad(fila) : null;
  }

  async buscarParaCambiar(id: CuentaId): Promise<Cuenta | null> {
    const [fila] = await transaccionEnCurso()
      .select()
      .from(cuentas)
      .where(eq(cuentas.id, id.valor))
      .for('no key update');
    return fila ? mapeadorDeCuenta.aEntidad(fila) : null;
  }

  async buscarPorCodigoParaCompartir(codigo: string): Promise<Cuenta | null> {
    const [fila] = await transaccionEnCurso().select().from(cuentas).where(eq(cuentas.codigo, codigo)).for('share');
    return fila ? mapeadorDeCuenta.aEntidad(fila) : null;
  }

  async tieneHijas(id: CuentaId): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ total: count() })
      .from(cuentas)
      .where(eq(cuentas.padreId, id.valor));
    return (fila?.total ?? 0) > 0;
  }

  async tieneEnlaces(id: CuentaId): Promise<boolean> {
    const [fila] = await transaccionEnCurso()
      .select({ total: count() })
      .from(enlaces)
      .where(eq(enlaces.cuentaId, id.valor));
    return (fila?.total ?? 0) > 0;
  }

  async hayCuentas(): Promise<boolean> {
    const [fila] = await transaccionEnCurso().select({ id: cuentas.id }).from(cuentas).limit(1);
    return fila !== undefined;
  }

  async agregar(cuenta: Cuenta): Promise<void> {
    await transaccionEnCurso().insert(cuentas).values(mapeadorDeCuenta.aFila(cuenta));
  }

  async guardar(cuenta: Cuenta): Promise<void> {
    await transaccionEnCurso()
      .update(cuentas)
      .set(mapeadorDeCuenta.aFila(cuenta))
      .where(eq(cuentas.id, cuenta.id.valor));
  }

  async eliminar(cuenta: Cuenta): Promise<void> {
    await transaccionEnCurso().delete(cuentas).where(eq(cuentas.id, cuenta.id.valor));
  }
}
