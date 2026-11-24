import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ExistenciaAlCierreDto } from '../../dto/cierre.dto.js';
import type { VistaDelKardex } from '../../dto/documento.dto.js';
import type { DependenciasDeCierres } from './dependencias-de-cierres.js';
import { existenciaADto } from './dtos-de-cierre.js';

export class ListarExistenciasAlCierre {
  constructor(private readonly dependencias: Pick<DependenciasDeCierres, 'unidadDeTrabajo' | 'cierres'>) {}

  /**
   * La foto de un mes cerrado: cantidad, costo y valor por artículo y bodega, con su renglón «En tránsito interno».
   * Cada usuario ve las bodegas que tiene asignadas; sin `costos.ver`, solo las cantidades. Un mes reabierto no tiene foto.
   * @throws RecursoNoEncontrado si el mes nunca se cerró o está reabierto.
   */
  ejecutar(operador: Operador, pedido: { periodo: string; vista: VistaDelKardex }): Promise<ExistenciaAlCierreDto[]> {
    const { unidadDeTrabajo, cierres } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const cierre = await cierres.buscar(pedido.periodo);
      if (cierre?.estado !== 'cerrado') throw new RecursoNoEncontrado('El cierre');
      return (await cierres.existencias(pedido.periodo)).map((fila) => existenciaADto(fila, pedido.vista));
    });
  }
}
