import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { PoliticaDeAnticipos } from '../aplicacion/puertos/puertos-de-anticipos.js';

const DIAS_PARA_LIQUIDAR = 'cuentas-por-liquidar.anticipos.dias_para_liquidar';
const BLOQUEAR_CON_VENCIDOS = 'cuentas-por-liquidar.anticipos.bloquear_con_vencidos';

/** La política de anticipos según la configuración por niveles (empresa → instalación → predeterminado). */
export class PoliticaDeAnticiposEnConfiguracion implements PoliticaDeAnticipos {
  diasParaLiquidar({ cuentaId, empresaId }: ContextoEmpresa): Promise<number> {
    return configuracion.lector.obtener<number>(DIAS_PARA_LIQUIDAR, { cuentaId, empresaId });
  }

  bloquearConVencidos({ cuentaId, empresaId }: ContextoEmpresa): Promise<boolean> {
    return configuracion.lector.obtener<boolean>(BLOQUEAR_CON_VENCIDOS, { cuentaId, empresaId });
  }
}
