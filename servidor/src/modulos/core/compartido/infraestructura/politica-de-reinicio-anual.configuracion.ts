import { configuracion } from '../../configuracion/contexto.js';
import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import type { PoliticaDeReinicioAnual } from '../aplicacion/correlativos.js';

export const REINICIO_ANUAL_DE_CORRELATIVOS = 'core.correlativos.reinicio_anual';

/** Lo dice la variable `core.correlativos.reinicio_anual` de la empresa (o de la instalación). */
export class PoliticaDeReinicioAnualEnConfiguracion implements PoliticaDeReinicioAnual {
  aplica({ cuentaId, empresaId }: ContextoEmpresa): Promise<boolean> {
    return configuracion.lector.obtener<boolean>(REINICIO_ANUAL_DE_CORRELATIVOS, { cuentaId, empresaId });
  }
}
