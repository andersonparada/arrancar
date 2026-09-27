import { and, eq } from 'drizzle-orm';
import type { Ejecutor } from '../../../base-datos/conexion.js';
import { Identificador, type CuentaId } from '../../../compartido/dominio/identificador.js';
import type { RepositorioCuentas } from '../../aplicacion/puertos/repositorio-cuentas.js';
import { Cuenta } from '../../dominio/cuenta.js';
import { cuentaModulos, cuentas } from './cuentas.tablas.js';

/**
 * Las cuentas están por encima de la seguridad por filas: solo soporte las toca.
 * Quien arma su propia transacción (el alta) indica el ejecutor.
 */
export class RepositorioCuentasDrizzle implements RepositorioCuentas {
  constructor(private readonly ejecutor: () => Ejecutor) {}

  async buscar(id: CuentaId): Promise<Cuenta | null> {
    const [fila] = await this.ejecutor().select().from(cuentas).where(eq(cuentas.id, id.valor));
    return fila
      ? Cuenta.reconstruir({ id: Identificador.desde(fila.id), nombre: fila.nombre, activa: fila.activa })
      : null;
  }

  async agregar(cuenta: Cuenta): Promise<void> {
    const { id, nombre, activa } = cuenta.instantanea();
    await this.ejecutor().insert(cuentas).values({ id: id.valor, nombre, activa });
  }

  async actualizar(cuenta: Cuenta): Promise<void> {
    const { id, nombre, activa } = cuenta.instantanea();
    await this.ejecutor().update(cuentas).set({ nombre, activa }).where(eq(cuentas.id, id.valor));
  }

  async modulosContratados(id: CuentaId): Promise<string[]> {
    const filas = await this.ejecutor()
      .select({ clave: cuentaModulos.moduloClave })
      .from(cuentaModulos)
      .where(eq(cuentaModulos.cuentaId, id.valor));
    return filas.map((fila) => fila.clave);
  }

  async contratar(id: CuentaId, modulo: string): Promise<void> {
    await this.ejecutor()
      .insert(cuentaModulos)
      .values({ cuentaId: id.valor, moduloClave: modulo })
      .onConflictDoNothing();
  }

  async dejarDeContratar(id: CuentaId, modulo: string): Promise<void> {
    await this.ejecutor()
      .delete(cuentaModulos)
      .where(and(eq(cuentaModulos.cuentaId, id.valor), eq(cuentaModulos.moduloClave, modulo)));
  }
}
