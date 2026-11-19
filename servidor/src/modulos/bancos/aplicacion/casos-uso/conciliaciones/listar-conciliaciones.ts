import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { periodoSiguiente } from '../../../dominio/conciliacion.js';
import type { ListaDeConciliacionesDto } from '../../dto/conciliacion.dto.js';
import { periodoDeLaPrimera } from '../../periodo-de-la-primera-conciliacion.js';
import type { DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

type Dependencias = Pick<DependenciasDeConciliaciones, 'unidadDeTrabajo' | 'consultas' | 'cargaInicial'>;

/**
 * Las conciliaciones de una cuenta, de la más reciente a la más antigua, y el periodo que toca conciliar: el mes
 * siguiente a la última o, sin ninguna, el de la fecha de inicio o el del primer movimiento.
 */
export class ListarConciliaciones {
  constructor(private readonly dependencias: Dependencias) {}

  ejecutar(operador: Operador, cuentaBancariaId: string): Promise<ListaDeConciliacionesDto> {
    const { unidadDeTrabajo, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliaciones = await consultas.listar(cuentaBancariaId);
      const ultima = conciliaciones[0];
      const siguiente = ultima
        ? periodoSiguiente({ anio: ultima.anio, mes: ultima.mes })
        : await periodoDeLaPrimera(operador, this.dependencias, cuentaBancariaId);
      return { conciliaciones, periodoSiguiente: siguiente };
    });
  }
}
