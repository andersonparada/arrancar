import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { CatalogosDeParcelasDto } from '../../dto/catalogos.dto.js';
import type { ConsultasDeCatalogos } from '../../puertos/consultas-de-catalogos.js';
import type { ConsultasTiposDeParcela } from '../../puertos/consultas-tipos-de-parcela.js';
import type { RepositorioTiposDeParcela } from '../../puertos/repositorio-tipos-de-parcela.js';
import { SembrarTiposDeParcela } from '../tipos-de-parcela/sembrar-tipos-de-parcela.js';

/** Las localidades, los inmuebles y los tipos de parcela que se eligen al registrar una parcela, con la seguridad de cada tabla. */
export class ObtenerCatalogos {
  private readonly sembrar: SembrarTiposDeParcela;

  constructor(
    private readonly dependencias: {
      unidadDeTrabajo: UnidadDeTrabajo;
      consultas: ConsultasDeCatalogos;
      consultasDeTipos: ConsultasTiposDeParcela;
      repositorioDeTipos: RepositorioTiposDeParcela;
    },
  ) {
    this.sembrar = new SembrarTiposDeParcela(dependencias.repositorioDeTipos);
  }

  ejecutar(operador: Operador): Promise<CatalogosDeParcelasDto> {
    const { unidadDeTrabajo, consultas, consultasDeTipos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      // Una empresa nueva aún no tiene tipos: se le da la lista sugerida, igual que al listar los tipos.
      await this.sembrar.ejecutar(operador);
      return {
        localidades: await consultas.localidades(),
        inmuebles: await consultas.inmuebles(),
        tipos: await consultasDeTipos.listar(),
      };
    });
  }
}
