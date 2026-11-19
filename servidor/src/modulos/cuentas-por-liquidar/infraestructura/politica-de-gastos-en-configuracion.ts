import type { ContextoEmpresa } from '../../core/compartido/aplicacion/contexto-empresa.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { PoliticaDeGastos } from '../aplicacion/puertos/puertos-de-gastos.js';

const SIN_DOCUMENTO_PERMITIDOS = 'cuentas-por-liquidar.gastos_sin_documento.permitidos';

/** La política de gastos según la configuración por niveles (empresa → instalación → predeterminado). */
export class PoliticaDeGastosEnConfiguracion implements PoliticaDeGastos {
  sinDocumentoPermitido({ cuentaId, empresaId }: ContextoEmpresa): Promise<boolean> {
    return configuracion.lector.obtener<boolean>(SIN_DOCUMENTO_PERMITIDOS, { cuentaId, empresaId });
  }
}
