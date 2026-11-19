import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { ConfiguracionDeVales } from '../aplicacion/puertos/puertos-de-vales.js';

/** La variable de los vales provisionales, de la configuración por niveles (empresa → instalación). */
export class ConfiguracionDeValesEnConfiguracion implements ConfiguracionDeVales {
  diasParaAvisar({ cuentaId, empresaId }: Operador): Promise<number> {
    return configuracion.lector.obtener<number>('caja-chica.vales_provisionales.dias_para_avisar', {
      cuentaId,
      empresaId,
    });
  }
}
