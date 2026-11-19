import { ListarSerieDeTipos } from '../../core/monedas/aplicacion/casos-uso/listar-serie-de-tipos.js';
import { listarMonedas, tiposDeCambio } from '../../core/monedas/contexto.js';
import type { CatalogoDeMonedasDelNucleo, MonedaDelCatalogo } from '../aplicacion/puertos/catalogo-de-monedas.js';
import type { SerieDeTiposDelNucleo, TipoDeLaSerieDto } from '../aplicacion/puertos/serie-de-tipos.js';

/** El catálogo de monedas del núcleo (`core.monedas`), sin seguridad por empresa. */
export class CatalogoDelNucleo implements CatalogoDeMonedasDelNucleo {
  listar(): Promise<MonedaDelCatalogo[]> {
    return listarMonedas.ejecutar();
  }
}

/** La serie de tipos de cambio del núcleo: la misma que lee el resto del sistema (guarda en memoria lo leído). */
export class SerieDelNucleo implements SerieDeTiposDelNucleo {
  private readonly listar = new ListarSerieDeTipos({ tiposDeCambio });

  serie(moneda: string, desde: string, hasta: string): Promise<TipoDeLaSerieDto[]> {
    return this.listar.ejecutar(moneda, desde, hasta);
  }
}
