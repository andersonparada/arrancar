import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/empresas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type {
  AvisosDeEmpresa,
  AvisosDeFechaDeInicio,
  EmpresaGuardada,
  FechaDeInicioPorCambiar,
} from '../aplicacion/puertos/avisos-de-empresa.js';

/** Avisa por el mediador; lo escuchan solo los módulos activos en la cuenta. */
export class AvisosDeEmpresaEnMediador implements AvisosDeEmpresa, AvisosDeFechaDeInicio {
  empresaGuardada(operador: Operador, aviso: EmpresaGuardada): Promise<void> {
    return mediador.avisar(operador, 'empresas.empresa_guardada', aviso);
  }

  fechaDeInicioPorCambiar(operador: Operador, aviso: FechaDeInicioPorCambiar): Promise<void> {
    return mediador.avisar(operador, 'empresas.fecha_de_inicio_por_cambiar', aviso);
  }
}
