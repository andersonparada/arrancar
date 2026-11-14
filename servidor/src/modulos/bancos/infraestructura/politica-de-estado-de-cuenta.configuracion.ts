import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { PoliticaDeEstadoDeCuenta } from '../aplicacion/puertos/politica-de-estado-de-cuenta.js';

/** Lo dice la variable `bancos.conciliaciones.exigir_estado_de_cuenta` de la empresa (o de la instalación). */
export class PoliticaDeEstadoDeCuentaEnConfiguracion implements PoliticaDeEstadoDeCuenta {
  exigeEstadoDeCuenta({ cuentaId, empresaId }: Operador): Promise<boolean> {
    return configuracion.lector.obtener<boolean>('bancos.conciliaciones.exigir_estado_de_cuenta', {
      cuentaId,
      empresaId,
    });
  }
}
