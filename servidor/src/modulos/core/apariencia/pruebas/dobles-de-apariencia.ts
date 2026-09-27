import type {
  AjusteDeApariencia,
  AjustesDeApariencia,
  AjustesGuardados,
} from '../aplicacion/puertos/ajustes-de-apariencia.js';
import type { ConvertidorDeLogo } from '../aplicacion/puertos/convertidor-de-logo.js';

export const APARIENCIA_DE_ARRANCAR: AjustesGuardados = {
  nombreAplicacion: 'Arrancar',
  colorPrincipal: '#1f4d2c',
  colorAcento: '#e9c46a',
  versionLogo: null,
};

export class AjustesEnMemoria implements AjustesDeApariencia {
  private actuales: AjustesGuardados = { ...APARIENCIA_DE_ARRANCAR };
  readonly guardadosPor: string[] = [];

  async leer(): Promise<AjustesGuardados> {
    return { ...this.actuales };
  }

  async guardar(cambios: Partial<AjustesGuardados>, usuarioId: string): Promise<void> {
    this.actuales = { ...this.actuales, ...cambios };
    this.guardadosPor.push(usuarioId);
  }

  async restablecer(ajustes: readonly AjusteDeApariencia[]): Promise<void> {
    for (const ajuste of ajustes) this.actuales = { ...this.actuales, [ajuste]: APARIENCIA_DE_ARRANCAR[ajuste] };
  }
}

export class ConvertidorDeLogoFalso implements ConvertidorDeLogo {
  async aPngCuadrado(contenido: Buffer): Promise<Buffer> {
    return Buffer.concat([Buffer.from('png:'), contenido]);
  }
}
