import { configuracionServicio, DESTINO_INSTALACION } from '../../servicios/configuracion.servicio.js';
import type {
  AjusteDeApariencia,
  AjustesDeApariencia,
  AjustesGuardados,
} from '../aplicacion/puertos/ajustes-de-apariencia.js';

/** Variable de configuración (nivel instalación) donde se guarda cada ajuste. */
const CLAVES: Record<AjusteDeApariencia, string> = {
  nombreAplicacion: 'core.interfaz.nombre_aplicacion',
  colorPrincipal: 'core.apariencia.color_principal',
  colorAcento: 'core.apariencia.color_acento',
  versionLogo: 'core.apariencia.version_logo',
};

export class AjustesEnConfiguracion implements AjustesDeApariencia {
  async leer(): Promise<AjustesGuardados> {
    const valores = await configuracionServicio.valoresPublicos(DESTINO_INSTALACION);
    const valorDe = <Valor>(ajuste: AjusteDeApariencia) => valores[CLAVES[ajuste]] as Valor;
    return {
      nombreAplicacion: valorDe<string>('nombreAplicacion'),
      colorPrincipal: valorDe<string>('colorPrincipal'),
      colorAcento: valorDe<string>('colorAcento'),
      versionLogo: valorDe<string | null>('versionLogo'),
    };
  }

  async guardar(cambios: Partial<AjustesGuardados>, usuarioId: string): Promise<void> {
    for (const [ajuste, valor] of Object.entries(cambios) as [AjusteDeApariencia, unknown][]) {
      await configuracionServicio.establecer(
        DESTINO_INSTALACION,
        undefined,
        CLAVES[ajuste],
        'instalacion',
        valor,
        usuarioId,
      );
    }
  }

  async restablecer(ajustes: readonly AjusteDeApariencia[]): Promise<void> {
    for (const ajuste of ajustes) {
      await configuracionServicio.restablecer(DESTINO_INSTALACION, undefined, CLAVES[ajuste], 'instalacion');
    }
  }
}
