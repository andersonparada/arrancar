import type { EstablecerValor } from '../../configuracion/aplicacion/casos-uso/establecer-valor.js';
import type { RestablecerValor } from '../../configuracion/aplicacion/casos-uso/restablecer-valor.js';
import type { LectorDeConfiguracion } from '../../configuracion/aplicacion/lector-de-configuracion.js';
import { DESTINO_INSTALACION } from '../../configuracion/dominio/destino.js';
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

const EN_LA_INSTALACION = { destino: DESTINO_INSTALACION, nivel: 'instalacion' } as const;

interface Configuracion {
  lector: LectorDeConfiguracion;
  establecer: EstablecerValor;
  restablecer: RestablecerValor;
}

export class AjustesEnConfiguracion implements AjustesDeApariencia {
  constructor(private readonly configuracion: Configuracion) {}

  async leer(): Promise<AjustesGuardados> {
    const valores = await this.configuracion.lector.valoresPublicos({ destino: DESTINO_INSTALACION });
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
      await this.configuracion.establecer.ejecutar({ ...EN_LA_INSTALACION, clave: CLAVES[ajuste], valor, usuarioId });
    }
  }

  async restablecer(ajustes: readonly AjusteDeApariencia[]): Promise<void> {
    for (const ajuste of ajustes) {
      await this.configuracion.restablecer.ejecutar({ ...EN_LA_INSTALACION, clave: CLAVES[ajuste] });
    }
  }
}
