import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { TopeDeDiferenciaMenor } from '../aplicacion/puertos/puertos-de-ajustes.js';

const TOPE = 'cuentas-por-pagar.ajustes.tope_diferencia_menor';

/** El tope de «Diferencia menor» según la configuración de la empresa (quetzales), convertido a centavos. */
export class TopeDeDiferenciaEnConfiguracion implements TopeDeDiferenciaMenor {
  async centavos({ cuentaId, empresaId }: ContextoEmpresa): Promise<number> {
    const quetzales = await configuracion.lector.obtener<number>(TOPE, { cuentaId, empresaId });
    return Math.round(quetzales * 100);
  }
}
