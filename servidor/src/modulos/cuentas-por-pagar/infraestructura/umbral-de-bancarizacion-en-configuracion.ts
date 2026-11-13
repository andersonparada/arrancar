import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { UmbralDeBancarizacion } from '../aplicacion/puertos/puertos-de-documentos.js';

const UMBRAL = 'cuentas-por-pagar.bancarizacion.umbral';

/** El umbral de bancarización según la configuración de la instalación (quetzales), convertido a centavos. */
export class UmbralDeBancarizacionEnConfiguracion implements UmbralDeBancarizacion {
  async centavos({ cuentaId, empresaId }: ContextoEmpresa): Promise<number> {
    const quetzales = await configuracion.lector.obtener<number>(UMBRAL, { cuentaId, empresaId });
    return Math.round(quetzales * 100);
  }
}
