import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { ConceptoDeIngreso } from '../../../dominio/concepto-de-ingreso.js';
import { datosDeConceptoDeIngreso } from '../../datos-de-concepto-de-ingreso.js';
import type { ConceptoDeIngresoDto, SolicitudDeConceptoDeIngreso } from '../../dto/concepto-de-ingreso.dto.js';
import type { DependenciasDeConceptosDeIngreso } from './dependencias-de-conceptos-de-ingreso.js';

export class CrearConceptoDeIngreso {
  constructor(private readonly dependencias: DependenciasDeConceptosDeIngreso) {}

  /**
   * @throws ConceptoDeIngresoInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeConceptoDeIngreso): Promise<ConceptoDeIngresoDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const conceptoDeIngreso = ConceptoDeIngreso.crear(
      Identificador.desde(operador.empresaId),
      datosDeConceptoDeIngreso(solicitud),
    );
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await repositorio.agregar(conceptoDeIngreso);
      return consultas.obtener(conceptoDeIngreso.id.valor);
    });
  }
}
