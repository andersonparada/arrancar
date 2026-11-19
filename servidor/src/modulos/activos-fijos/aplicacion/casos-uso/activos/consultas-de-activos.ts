import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ActivoDto, ActivoFichaDto, FiltrosDeActivos, UbicacionesDto } from '../../dto/activo.dto.js';
import type { DependenciasDeActivos } from './dependencias-de-activos.js';

type Lectura = Pick<DependenciasDeActivos, 'unidadDeTrabajo' | 'consultas'>;

export class ListarActivos {
  constructor(private readonly dependencias: Lectura) {}

  ejecutar(operador: Operador, filtros: FiltrosDeActivos = {}): Promise<ActivoDto[]> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.listar(filtros));
  }
}

export class ObtenerActivo {
  constructor(private readonly dependencias: Lectura) {}

  /** @throws RecursoNoEncontrado si no existe o no es de la empresa. */
  ejecutar(operador: Operador, activoId: string): Promise<ActivoFichaDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => consultas.obtener(activoId));
  }
}

/** Las localidades y departamentos activos de la empresa (AF-P22 b: todos, vea o no el usuario su localidad). */
export class ListarUbicaciones {
  constructor(private readonly dependencias: Pick<DependenciasDeActivos, 'unidadDeTrabajo' | 'ubicaciones'>) {}

  ejecutar(operador: Operador): Promise<UbicacionesDto> {
    const { unidadDeTrabajo, ubicaciones } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => ubicaciones.activas());
  }
}
