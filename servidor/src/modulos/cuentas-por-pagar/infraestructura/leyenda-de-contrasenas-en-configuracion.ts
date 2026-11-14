import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { LeyendaDeContrasenas } from '../aplicacion/puertos/puertos-de-impresion-de-contrasenas.js';

const LEYENDA = 'cuentas-por-pagar.contrasenas.leyenda';

/** La leyenda de la contraseña impresa según la configuración de la empresa o de la instalación. */
export class LeyendaDeContrasenasEnConfiguracion implements LeyendaDeContrasenas {
  texto({ cuentaId, empresaId }: Operador): Promise<string> {
    return configuracion.lector.obtener<string>(LEYENDA, { cuentaId, empresaId });
  }
}
