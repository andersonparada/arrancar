import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/bancos.contratos.js';
import type { MediosDePago } from '../../core/contratos/bancos.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { MediosDePagoDeBancos } from '../aplicacion/puertos/puertos-de-opciones.js';

/** Las cuentas y chequeras de Bancos van por el mediador: este módulo no importa nada del otro. */
export class MediosDeBancosEnMediador implements MediosDePagoDeBancos {
  medios(operador: Operador, fecha: string): Promise<MediosDePago> {
    return mediador.enviar(operador, 'bancos.medios_de_pago', { fecha });
  }
}
