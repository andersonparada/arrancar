import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { PoliticaDeSobregiro } from '../aplicacion/puertos/politica-de-sobregiro.js';

/** Lo dice la variable `bancos.cuentas.permitir_sobregiro` de la empresa (o de la instalación). */
export class PoliticaDeSobregiroEnConfiguracion implements PoliticaDeSobregiro {
  permiteSobregiro({ cuentaId, empresaId }: Operador): Promise<boolean> {
    return configuracion.lector.obtener<boolean>('bancos.cuentas.permitir_sobregiro', { cuentaId, empresaId });
  }
}
