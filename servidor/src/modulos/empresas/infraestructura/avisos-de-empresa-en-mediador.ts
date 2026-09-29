import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/empresas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type { AvisosDeEmpresa, EmpresaGuardada } from '../aplicacion/puertos/avisos-de-empresa.js';

/** Avisa por el mediador; lo escuchan solo los módulos activos en la cuenta. */
export class AvisosDeEmpresaEnMediador implements AvisosDeEmpresa {
  empresaGuardada(operador: Operador, aviso: EmpresaGuardada): Promise<void> {
    return mediador.avisar(operador, 'empresas.empresa_guardada', aviso);
  }
}
