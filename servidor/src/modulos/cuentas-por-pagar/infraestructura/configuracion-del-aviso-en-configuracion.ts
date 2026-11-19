import { configuracion } from '../../core/configuracion/contexto.js';
import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import type {
  AjustesDelAviso,
  ConfiguracionDelAviso,
  GuardadorDeAjustesDelAviso,
  EnvioDelAviso,
} from '../aplicacion/puertos/puertos-de-avisos-de-pago.js';
import { CLAVES_DE_AVISOS } from '../configuracion-de-avisos.js';

/** Los ajustes de los avisos de pago según la configuración de la empresa o, si no cambió nada, la de la instalación. */
export class ConfiguracionDelAvisoEnConfiguracion implements ConfiguracionDelAviso, GuardadorDeAjustesDelAviso {
  async de({ cuentaId, empresaId }: Pick<Operador, 'cuentaId' | 'empresaId'>): Promise<AjustesDelAviso> {
    const destino = { cuentaId, empresaId };
    const { lector } = configuracion;
    const [envio, asunto, mensaje, adjuntarComprobante, copiaALaEmpresa] = await Promise.all([
      lector.obtener<EnvioDelAviso>(CLAVES_DE_AVISOS.envio, destino),
      lector.obtener<string>(CLAVES_DE_AVISOS.asunto, destino),
      lector.obtener<string>(CLAVES_DE_AVISOS.mensaje, destino),
      lector.obtener<boolean>(CLAVES_DE_AVISOS.adjuntarComprobante, destino),
      lector.obtener<boolean>(CLAVES_DE_AVISOS.copiaALaEmpresa, destino),
    ]);
    return { envio, asunto, mensaje, adjuntarComprobante, copiaALaEmpresa };
  }

  async guardar(operador: Operador, ajustes: AjustesDelAviso): Promise<void> {
    const destino = { cuentaId: operador.cuentaId, empresaId: operador.empresaId };
    for (const [ajuste, clave] of Object.entries(CLAVES_DE_AVISOS) as [keyof AjustesDelAviso, string][]) {
      await configuracion.establecer.ejecutar({
        destino,
        nivel: 'empresa',
        clave,
        valor: ajustes[ajuste],
        usuarioId: operador.usuarioId,
      });
    }
  }
}
