import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { TopeDeDiferenciaDelPago } from '../aplicacion/puertos/puertos-de-pagos.js';

const TOPE = 'cuentas-por-pagar.pagos.tope_diferencia';

/** El tope de la diferencia de centavos al pagar según la configuración de la empresa (quetzales), en centavos. */
export class TopeDeDiferenciaDelPagoEnConfiguracion implements TopeDeDiferenciaDelPago {
  async centavos({ cuentaId, empresaId }: ContextoEmpresa): Promise<number> {
    const quetzales = await configuracion.lector.obtener<number>(TOPE, { cuentaId, empresaId });
    return Math.round(quetzales * 100);
  }
}
