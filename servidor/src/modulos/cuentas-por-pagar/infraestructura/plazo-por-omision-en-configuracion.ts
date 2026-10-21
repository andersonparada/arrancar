import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { PlazoPorOmision } from '../aplicacion/puertos/puertos-de-documentos.js';

const MESES_POR_OMISION = 'cuentas-por-pagar.vencimientos.meses_por_omision';

/** Los meses de crédito por omisión según la configuración de la empresa (empresa, cuenta, instalación o predeterminado). */
export class PlazoPorOmisionEnConfiguracion implements PlazoPorOmision {
  meses({ cuentaId, empresaId }: ContextoEmpresa): Promise<number> {
    return configuracion.lector.obtener<number>(MESES_POR_OMISION, { cuentaId, empresaId });
  }
}
