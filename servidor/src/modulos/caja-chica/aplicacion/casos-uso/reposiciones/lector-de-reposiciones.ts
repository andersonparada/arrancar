import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Reposicion } from '../../../dominio/reposiciones.js';
import type { ReposicionDto } from '../../dto/reposiciones.dto.js';
import { firmadosDeLasLineas, reposicionDto } from './armado-de-la-reposicion.js';
import type { DependenciasDeReposiciones } from './dependencias-de-reposiciones.js';

type Dependencias = Pick<DependenciasDeReposiciones, 'reposiciones' | 'consultas'>;

/** Arma la ficha de una reposición con lo que lee de la transacción en curso; la usan los casos de uso al responder. */
export class LectorDeReposiciones {
  constructor(private readonly dependencias: Dependencias) {}

  async leer(reposicion: Reposicion, avisos: readonly string[] = []): Promise<ReposicionDto> {
    const { reposiciones, consultas } = this.dependencias;
    const [lineas, comprobantes] = await Promise.all([
      reposiciones.lineas(reposicion.id),
      consultas.comprobantesDe(reposicion.id),
    ]);
    return reposicionDto({ reposicion, firmados: firmadosDeLasLineas(lineas, comprobantes), avisos });
  }

  /** La reposición sin bloquearla. @throws RecursoNoEncontrado si no existe o su fondo no está al alcance. */
  async buscar(reposicionId: string): Promise<Reposicion> {
    const reposicion = await this.dependencias.reposiciones.buscar(reposicionId);
    if (!reposicion) throw new RecursoNoEncontrado('La reposición');
    return reposicion;
  }
}
