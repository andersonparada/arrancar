import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { PoliticaDeVencimientoDeCheques } from '../aplicacion/puertos/politica-de-vencimiento-de-cheques.js';

/** Lo dice la variable `bancos.cheques.meses_de_vencimiento` de la empresa (o de la instalación). */
export class PoliticaDeVencimientoDeChequesEnConfiguracion implements PoliticaDeVencimientoDeCheques {
  mesesDeVencimiento({ cuentaId, empresaId }: Operador): Promise<number> {
    return configuracion.lector.obtener<number>('bancos.cheques.meses_de_vencimiento', { cuentaId, empresaId });
  }
}
