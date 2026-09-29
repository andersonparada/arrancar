import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { PoliticaDeMismaFechaEnAnulacion } from '../aplicacion/puertos/politica-de-misma-fecha-en-anulacion.js';

/** Lo dice la variable `bancos.anulaciones.misma_fecha` de la empresa (o de la instalación). */
export class PoliticaDeMismaFechaEnAnulacionEnConfiguracion implements PoliticaDeMismaFechaEnAnulacion {
  aplica({ cuentaId, empresaId }: Operador): Promise<boolean> {
    return configuracion.lector.obtener<boolean>('bancos.anulaciones.misma_fecha', { cuentaId, empresaId });
  }
}
