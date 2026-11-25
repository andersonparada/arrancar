import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { ModulosActivosDeLaCuentaEnRegistro } from '../../core/mediador/infraestructura/modulos-activos-de-la-cuenta-en-registro.js';
import type { ModulosActivosDeLaCuentaActual } from '../aplicacion/puertos/enlaces.js';

/** Los módulos activos de la cuenta del operador, los mismos que cuenta el mediador. */
export class ModulosActivosEnRegistro implements ModulosActivosDeLaCuentaActual {
  private readonly activos = new ModulosActivosDeLaCuentaEnRegistro();

  de(operador: Operador): Promise<ReadonlySet<string>> {
    return this.activos.activosPara(operador.cuentaId);
  }
}
