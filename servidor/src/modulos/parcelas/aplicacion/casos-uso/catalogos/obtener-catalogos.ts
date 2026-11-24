import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { CatalogosDeParcelasDto } from '../../dto/catalogos.dto.js';
import type { ConsultasDeCatalogos } from '../../puertos/consultas-de-catalogos.js';

/** Las localidades y los inmuebles que se eligen al registrar una parcela, con la seguridad de cada tabla. */
export class ObtenerCatalogos {
  constructor(private readonly dependencias: { unidadDeTrabajo: UnidadDeTrabajo; consultas: ConsultasDeCatalogos }) {}

  ejecutar(operador: Operador): Promise<CatalogosDeParcelasDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => ({
      localidades: await consultas.localidades(),
      inmuebles: await consultas.inmuebles(),
    }));
  }
}
