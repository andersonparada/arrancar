import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { ModulosActivosDeLaCuenta } from '../../core/mediador/aplicacion/puertos/modulos-activos-de-la-cuenta.js';
import type { CuentasPorPagarActivo } from '../aplicacion/puertos/cuentas-por-pagar-activo.js';

/** Clave del módulo Cuentas por pagar (`docs/modulos/cuentas-por-pagar.md`); mientras no exista, nunca está activo. */
export const CLAVE_DE_CUENTAS_POR_PAGAR = 'cuentas-por-pagar';

/** Lo dicen los módulos activos de la cuenta (los mismos que consulta el mediador). */
export class CuentasPorPagarActivoEnModulosActivos implements CuentasPorPagarActivo {
  constructor(private readonly modulosActivos: ModulosActivosDeLaCuenta) {}

  async estaActivo({ cuentaId }: Operador): Promise<boolean> {
    return (await this.modulosActivos.activosPara(cuentaId)).has(CLAVE_DE_CUENTAS_POR_PAGAR);
  }
}
