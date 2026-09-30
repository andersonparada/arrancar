import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Combustible } from '../../../dominio/combustible.js';
import { datosDeCombustible } from '../../datos-de-combustible.js';
import type { CombustibleDto, SolicitudDeCombustible } from '../../dto/combustible.dto.js';
import type { DependenciasDeCombustibles } from './dependencias-de-combustibles.js';

export class CrearCombustible {
  constructor(private readonly dependencias: DependenciasDeCombustibles) {}

  /**
   * @throws CombustibleInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeCombustible): Promise<CombustibleDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const combustible = Combustible.crear(Identificador.desde(operador.empresaId), datosDeCombustible(solicitud));
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.agregar(combustible);
      return consultas.obtener(combustible.id.valor);
    });
  }
}
