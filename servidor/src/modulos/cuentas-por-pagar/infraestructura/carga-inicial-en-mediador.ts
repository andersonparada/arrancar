import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/empresas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { CargaInicial, EstadoDeLaCarga } from '../aplicacion/puertos/puertos-de-saldos-iniciales.js';

/** La carga inicial va por el mediador: este módulo no importa nada de Empresas. */
export class CargaInicialEnMediador implements CargaInicial {
  obtener(operador: Operador): Promise<EstadoDeLaCarga> {
    return mediador.enviar(operador, 'empresas.obtener_carga_inicial', { empresaId: operador.empresaId });
  }
}
