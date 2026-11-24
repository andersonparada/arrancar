import type { Operador } from '../../../../../core/compartido/aplicacion/operador.js';
import type { ValorDeInmuebleDto } from '../../../dto/valor-de-inmueble.dto.js';
import { inmuebleExistente } from '../dependencias-de-inmuebles.js';
import type { DependenciasDeValores } from './dependencias-de-valores.js';

/** El histórico de valores de un inmueble, del más reciente al más antiguo. */
export class ListarValoresDeInmueble {
  constructor(
    private readonly dependencias: Pick<DependenciasDeValores, 'unidadDeTrabajo' | 'inmuebles' | 'consultas'>,
  ) {}

  /** @throws RecursoNoEncontrado si el inmueble no existe o el operador no lo ve. */
  ejecutar(operador: Operador, inmuebleId: string): Promise<ValorDeInmuebleDto[]> {
    const { unidadDeTrabajo, inmuebles, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      await inmuebleExistente(inmuebles, inmuebleId);
      return consultas.listar(inmuebleId);
    });
  }
}
