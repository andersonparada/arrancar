import type { Operador } from '../../../compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../compartido/aplicacion/unidad-de-trabajo.js';
import { anioDe } from '../../dominio/fecha-iso.js';
import type { CalendarioLaboral } from '../calendario-laboral.js';
import type { AsuetoDto, Asuetos, NuevoAsueto } from '../puertos/asuetos.js';

interface Dependencias {
  unidadDeTrabajo: UnidadDeTrabajo;
  asuetos: Asuetos;
  calendario: CalendarioLaboral;
}

/** Soporte carga un asueto que declaró la SAT o el gobierno; desde ahí deja de contar como día hábil. */
export class AgregarAsueto {
  constructor(private readonly dependencias: Dependencias) {}

  /**
   * @throws FechaInvalida si la fecha no existe.
   * @throws RecursoDuplicado si esa fecha ya tiene un asueto.
   */
  async ejecutar(operador: Operador, nuevo: NuevoAsueto): Promise<AsuetoDto> {
    const { unidadDeTrabajo, asuetos, calendario } = this.dependencias;
    const anio = anioDe(nuevo.fecha);
    const creado = await unidadDeTrabajo.ejecutar(operador, () => asuetos.agregar(nuevo));
    calendario.invalidar(anio);
    return creado;
  }
}
