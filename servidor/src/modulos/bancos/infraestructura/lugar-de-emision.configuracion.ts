import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { LugarDeEmision } from '../aplicacion/puertos/lugar-de-emision.js';

/** Lo dice la variable `bancos.cheques.lugar_de_emision` de la empresa (o de la instalación). */
export class LugarDeEmisionEnConfiguracion implements LugarDeEmision {
  de({ cuentaId, empresaId }: Operador): Promise<string> {
    return configuracion.lector.obtener<string>('bancos.cheques.lugar_de_emision', { cuentaId, empresaId });
  }
}
