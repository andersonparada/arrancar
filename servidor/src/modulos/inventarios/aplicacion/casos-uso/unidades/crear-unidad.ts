import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Unidad } from '../../../dominio/unidad.js';
import { datosDeUnidad } from '../../datos-de-unidad.js';
import type { UnidadDto, SolicitudDeUnidad } from '../../dto/unidad.dto.js';
import type { DependenciasDeUnidades } from './dependencias-de-unidades.js';

export class CrearUnidad {
  constructor(private readonly dependencias: DependenciasDeUnidades) {}

  /**
   * @throws UnidadInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeUnidad): Promise<UnidadDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const unidad = Unidad.crear(Identificador.desde(operador.empresaId), datosDeUnidad(solicitud));
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.agregar(unidad);
      return consultas.obtener(unidad.id.valor);
    });
  }
}
