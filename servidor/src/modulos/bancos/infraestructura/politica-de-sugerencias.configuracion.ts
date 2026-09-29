import type { Operador } from '../../core/compartido/aplicacion/operador.js';
import { configuracion } from '../../core/configuracion/contexto.js';
import type { ParametrosDeSugerencias, PoliticaDeSugerencias } from '../aplicacion/puertos/politica-de-sugerencias.js';

/** Lo dicen `bancos.sugerencias.vida_media_dias` y `bancos.sugerencias.confianza_minima` de la empresa (o la instalación). */
export class PoliticaDeSugerenciasEnConfiguracion implements PoliticaDeSugerencias {
  async parametros({ cuentaId, empresaId }: Operador): Promise<ParametrosDeSugerencias> {
    const destino = { cuentaId, empresaId };
    return {
      vidaMediaDias: await configuracion.lector.obtener<number>('bancos.sugerencias.vida_media_dias', destino),
      confianzaMinima: await configuracion.lector.obtener<number>('bancos.sugerencias.confianza_minima', destino),
    };
  }
}
