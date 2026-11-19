import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { AjustesDelAviso, GuardadorDeAjustesDelAviso } from '../../puertos/puertos-de-avisos-de-pago.js';

/**
 * Guarda los ajustes de los avisos de pago de la empresa (`avisos-de-pago.configurar`). Los valores ya pasaron por el
 * esquema de cada variable en la capa http; la configuración los vuelve a validar al guardar.
 */
export class GuardarAjustesDelAviso {
  constructor(private readonly guardador: GuardadorDeAjustesDelAviso) {}

  async ejecutar(operador: Operador, ajustes: AjustesDelAviso): Promise<AjustesDelAviso> {
    await this.guardador.guardar(operador, ajustes);
    return ajustes;
  }
}
