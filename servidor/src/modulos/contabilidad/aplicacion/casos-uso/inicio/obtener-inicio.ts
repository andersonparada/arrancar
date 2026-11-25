import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { InicioDto } from '../../dto/inicio.dto.js';
import { inicioADto, type DependenciasDeInicio } from './dependencias-de-inicio.js';

export class ObtenerInicio {
  constructor(private readonly dependencias: Pick<DependenciasDeInicio, 'unidadDeTrabajo' | 'repositorio'>) {}

  /** @throws RecursoNoEncontrado si la empresa todavía no inició su contabilidad. */
  ejecutar(operador: Operador): Promise<InicioDto> {
    const { unidadDeTrabajo, repositorio } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const inicio = await repositorio.obtener();
      if (!inicio) throw new RecursoNoEncontrado('El inicio de la contabilidad');
      return inicioADto(inicio);
    });
  }
}
