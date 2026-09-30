import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { VigenciaDeCombustible } from '../../../dominio/vigencia-de-combustible.js';
import { datosDeVigenciaDeCombustible } from '../../datos-de-vigencia-de-combustible.js';
import type {
  VigenciaDeCombustibleDto,
  SolicitudDeVigenciaDeCombustible,
} from '../../dto/vigencia-de-combustible.dto.js';
import { cerrarVigenciaAbierta } from './cerrar-vigencia-abierta.js';
import type { DependenciasDeVigenciasDeCombustible } from './dependencias-de-vigencias-de-combustible.js';

export class CrearVigenciaDeCombustible {
  constructor(private readonly dependencias: DependenciasDeVigenciasDeCombustible) {}

  /**
   * @throws VigenciaDeCombustibleInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws VigenciaDeCombustibleEnUso si al cerrar la tasa anterior hay documentos que la usaron después.
   * @throws ReglaDeNegocioInfringida si se traslapa con otra vigencia del mismo combustible (la base lo impide).
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeVigenciaDeCombustible): Promise<VigenciaDeCombustibleDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const vigenciaDeCombustible = VigenciaDeCombustible.crear(
      Identificador.desde(operador.empresaId),
      datosDeVigenciaDeCombustible(solicitud),
    );
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await consultas.exigirReferencias(solicitud);
      await repositorio.bloquearCombustible(solicitud.combustibleId);
      await cerrarVigenciaAbierta(repositorio, vigenciaDeCombustible);
      await repositorio.agregar(vigenciaDeCombustible);
      return consultas.obtener(vigenciaDeCombustible.id.valor);
    });
  }
}
