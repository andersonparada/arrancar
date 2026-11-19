import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type { ModulosActivosDeLaCuenta } from '../../core/mediador/aplicacion/puertos/modulos-activos-de-la-cuenta.js';
import type { ModulosDeOrigen } from '../aplicacion/puertos/modulos-de-origen.js';

/** Lo dicen los módulos activos de la cuenta (los mismos que consulta el mediador). */
export class ModulosDeOrigenEnModulosActivos implements ModulosDeOrigen {
  constructor(private readonly modulosActivos: ModulosActivosDeLaCuenta) {}

  async estaActivo(operador: Operador, modulo: string): Promise<boolean> {
    return (await this.activos(operador)).has(modulo);
  }

  activos({ cuentaId }: Operador): Promise<ReadonlySet<string>> {
    return this.modulosActivos.activosPara(cuentaId);
  }
}
