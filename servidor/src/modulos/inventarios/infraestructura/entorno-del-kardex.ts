import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import '../../core/contratos/empresas.contratos.js';
import { mediador } from '../../core/mediador/contexto.js';
import type {
  CargaInicial,
  EstadoDeLaCarga,
  LectorDeTransito,
  LectorDelMetodoInicial,
  MesesCerrados,
} from '../aplicacion/puertos/entorno-del-kardex.js';
import type { MetodoDeCosteo } from '../dominio/costeo/tipos.js';

/** La carga inicial va por el mediador: este módulo no importa nada de Empresas. */
export class CargaInicialEnMediador implements CargaInicial {
  obtener(operador: Operador): Promise<EstadoDeLaCarga> {
    return mediador.enviar(operador, 'empresas.obtener_carga_inicial', { empresaId: operador.empresaId });
  }
}

/** Lee `inventarios.costeo.metodo_inicial` de la configuración (empresa, cuenta, instalación o el predeterminado). */
export class MetodoInicialEnConfiguracion implements LectorDelMetodoInicial {
  paraEmpresa({ cuentaId, empresaId }: Operador): Promise<MetodoDeCosteo> {
    return configuracion.lector.obtener<MetodoDeCosteo>('inventarios.costeo.metodo_inicial', { cuentaId, empresaId });
  }
}

/** Lee `inventarios.traslados.con_transito` de la configuración de la empresa (`false` si no se cambió). */
export class TransitoEnConfiguracion implements LectorDeTransito {
  conTransito({ cuentaId, empresaId }: Operador): Promise<boolean> {
    return configuracion.lector.obtener<boolean>('inventarios.traslados.con_transito', { cuentaId, empresaId });
  }
}

/**
 * Los cierres mensuales los crea INV-8; mientras no existan, ningún mes está cerrado. INV-8 reemplaza esta clase por la
 * que lee `inventarios.cierres`.
 */
export class MesesCerradosPendientes implements MesesCerrados {
  async estaCerrado(): Promise<boolean> {
    return false;
  }
}
