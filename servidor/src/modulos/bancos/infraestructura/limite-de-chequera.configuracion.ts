import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { LimiteDeChequera } from '../aplicacion/puertos/limite-de-chequera.js';

/** Lo dice la variable `bancos.chequeras.maximo_cheques` de la empresa (o de la instalación). */
export class LimiteDeChequeraEnConfiguracion implements LimiteDeChequera {
  maximoDeCheques({ cuentaId, empresaId }: Operador): Promise<number> {
    return configuracion.lector.obtener<number>('bancos.chequeras.maximo_cheques', { cuentaId, empresaId });
  }
}
