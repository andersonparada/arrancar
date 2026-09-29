import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Concepto } from '../../../dominio/concepto.js';
import { datosDeConcepto } from '../../datos-de-concepto.js';
import type { ConceptoDto, SolicitudDeConcepto } from '../../dto/concepto.dto.js';
import type { DependenciasDeConceptos } from './dependencias-de-conceptos.js';
import { SembrarConceptos } from './sembrar-conceptos.js';

export class CrearConcepto {
  private readonly sembrar: SembrarConceptos;

  constructor(private readonly dependencias: DependenciasDeConceptos) {
    this.sembrar = new SembrarConceptos(dependencias.repositorio);
  }

  /**
   * @throws ConceptoInvalido u otro error de datos si no cumple las reglas del dominio.
   * @throws RecursoDuplicado si repite un dato que debe ser único.
   */
  async ejecutar(operador: Operador, solicitud: SolicitudDeConcepto): Promise<ConceptoDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    const concepto = Concepto.crear(Identificador.desde(operador.empresaId), datosDeConcepto(solicitud));
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await this.sembrar.ejecutar(operador);
      await repositorio.agregar(concepto);
      return consultas.obtener(concepto.id.valor);
    });
  }
}
