import type { CambiosDeCuenta } from '../../dominio/cuenta.js';
import { cuentaExistente } from '../cuenta-existente.js';
import type { RepositorioCuentas } from '../puertos/repositorio-cuentas.js';

/** Renombra la cuenta o la suspende; suspendida, nadie puede trabajar en sus empresas. */
export class CambiarCuenta {
  constructor(private readonly dependencias: { repositorio: RepositorioCuentas }) {}

  /** @throws RecursoNoEncontrado si la cuenta no existe. */
  async ejecutar(cuentaId: string, cambios: CambiosDeCuenta): Promise<void> {
    const { repositorio } = this.dependencias;
    const cuenta = await cuentaExistente(repositorio, cuentaId);
    cuenta.cambiar(cambios);
    await repositorio.actualizar(cuenta);
  }
}
