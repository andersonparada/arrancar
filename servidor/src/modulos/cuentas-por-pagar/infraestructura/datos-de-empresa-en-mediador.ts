import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import '../../core/contratos/empresas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type {
  DatosDeLaEmpresa,
  EmpresaDeLaImpresion,
} from '../aplicacion/puertos/puertos-de-impresion-de-contrasenas.js';

/** Los datos de la empresa los da Empresas (orden `empresas.obtener_datos_de_empresa`): este módulo no la importa. */
export class DatosDeLaEmpresaEnMediador implements DatosDeLaEmpresa {
  obtener(operador: Operador): Promise<EmpresaDeLaImpresion> {
    return mediador.enviar(operador, 'empresas.obtener_datos_de_empresa', { empresaId: operador.empresaId });
  }
}
