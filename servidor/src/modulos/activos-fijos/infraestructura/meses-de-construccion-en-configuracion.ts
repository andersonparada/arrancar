import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { LectorDeMesesDeConstruccion } from '../aplicacion/puertos/lector-de-meses-de-construccion.js';

/** Los meses de aviso de las obras en construcción, de la configuración (por omisión, 12). */
export class MesesDeConstruccionEnConfiguracion implements LectorDeMesesDeConstruccion {
  paraEmpresa({ cuentaId, empresaId }: ContextoEmpresa): Promise<number> {
    return configuracion.lector.obtener<number>('activos-fijos.construccion.meses_de_aviso', { cuentaId, empresaId });
  }
}
