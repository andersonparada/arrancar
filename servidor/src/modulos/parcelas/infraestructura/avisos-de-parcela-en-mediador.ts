import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/parcelas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { AvisoDeBajaDeParcela, AvisosDeParcela } from '../aplicacion/puertos/configuracion-y-avisos.js';

/** Avisa por el mediador; lo escuchan solo los módulos activos en la cuenta (Ganadería, Cultivos…). */
export class AvisosDeParcelaEnMediador implements AvisosDeParcela {
  porInactivar(operador: Operador, aviso: AvisoDeBajaDeParcela): Promise<void> {
    return mediador.avisar(operador, 'parcelas.parcela_por_inactivar', aviso);
  }

  porEliminar(operador: Operador, aviso: { parcelaId: string }): Promise<void> {
    return mediador.avisar(operador, 'parcelas.parcela_por_eliminar', aviso);
  }
}
