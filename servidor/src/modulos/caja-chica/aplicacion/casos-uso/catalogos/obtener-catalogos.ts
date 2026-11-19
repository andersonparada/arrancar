import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { CatalogosDeCajaChicaDto } from '../../dto/catalogos.dto.js';
import type { ConsultasDeCatalogos } from '../../puertos/consultas-de-catalogos.js';

/** Los catálogos que necesitan las ventanas de Caja chica, con la seguridad por empresa y por alcance de cada tabla. */
export class ObtenerCatalogos {
  constructor(private readonly dependencias: { unidadDeTrabajo: UnidadDeTrabajo; consultas: ConsultasDeCatalogos }) {}

  ejecutar(operador: Operador): Promise<CatalogosDeCajaChicaDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => ({
      cuentas: await consultas.cuentas(),
      chequeras: await consultas.chequeras(),
      localidades: await consultas.localidades(),
      usuarios: await consultas.usuarios(),
      conceptosDeGasto: await consultas.conceptosDeGasto(),
    }));
  }
}
