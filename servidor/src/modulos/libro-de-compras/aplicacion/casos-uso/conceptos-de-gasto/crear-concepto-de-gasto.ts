import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { ConceptoDeGasto } from '../../../dominio/concepto-de-gasto.js';
import { datosDeConceptoDeGasto } from '../../datos-de-concepto-de-gasto.js';
import type { ConceptoDeGastoDto, SolicitudDeConceptoDeGasto } from '../../dto/concepto-de-gasto.dto.js';
import type { DependenciasDeConceptosDeGasto } from './dependencias-de-conceptos-de-gasto.js';

export class CrearConceptoDeGasto {
  constructor(private readonly dependencias: DependenciasDeConceptosDeGasto) {}

  /**
   * @throws ConceptoDeGastoInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeConceptoDeGasto): Promise<ConceptoDeGastoDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const conceptoDeGasto = ConceptoDeGasto.crear(
      Identificador.desde(operador.empresaId),
      datosDeConceptoDeGasto(solicitud),
    );
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.agregar(conceptoDeGasto);
      return consultas.obtener(conceptoDeGasto.id.valor);
    });
  }
}
