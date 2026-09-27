import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { FichaDeTerceroDto } from '../../dto/tercero.dto.js';
import type { ConsultasTerceros } from '../../puertos/consultas.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  consultas: ConsultasTerceros;
}

/** Datos generales, contactos y el detalle de cada papel del tercero. */
export class ObtenerFichaDeTercero {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws RecursoNoEncontrado si no existe en la cuenta. */
  ejecutar(operador: Operador, terceroId: string): Promise<FichaDeTerceroDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtenerFicha(terceroId));
  }
}
