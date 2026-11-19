import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { LectorDePrimerMes } from '../aplicacion/puertos/lector-de-primer-mes.js';
import type { PrimerMes } from '../dominio/depreciacion/meses.js';

/** El primer mes de depreciación de la empresa, de su configuración (por omisión, el mes de inicio de uso). */
export class PrimerMesEnConfiguracion implements LectorDePrimerMes {
  paraEmpresa({ cuentaId, empresaId }: ContextoEmpresa): Promise<PrimerMes> {
    return configuracion.lector.obtener<PrimerMes>('activos-fijos.depreciacion.primer_mes', { cuentaId, empresaId });
  }
}
