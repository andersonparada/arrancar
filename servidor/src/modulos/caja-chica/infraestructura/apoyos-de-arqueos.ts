import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { ConfiguracionDeArqueos } from '../aplicacion/puertos/puertos-de-arqueos.js';
import { ConfiguracionDeControlEnConfiguracion } from './apoyos-de-reposiciones.js';

/** Las variables de los arqueos, de la configuración por niveles (empresa → instalación). */
export class ConfiguracionDeArqueosEnConfiguracion
  extends ConfiguracionDeControlEnConfiguracion
  implements ConfiguracionDeArqueos
{
  diasParaAvisar({ cuentaId, empresaId }: Operador): Promise<number> {
    return configuracion.lector.obtener<number>('caja-chica.arqueos.dias_para_avisar', { cuentaId, empresaId });
  }
}
