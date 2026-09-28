import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../dominio/centavos.js';
import type { ConciliacionDto } from '../../dto/conciliacion.dto.js';
import { conciliacionExistente, type DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

/** Cierra la conciliación: solo si la diferencia (saldo según banco − saldo conciliado) es cero. */
export class CerrarConciliacion {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /**
   * @throws ConciliacionCerrada si ya está cerrada.
   * @throws ConciliacionConDiferencia si la diferencia no es cero.
   */
  ejecutar(operador: Operador, conciliacionId: string): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionExistente(repositorio, conciliacionId);
      const { diferencia } = await consultas.obtener(conciliacionId);
      conciliacion.cerrar(aCentavos(diferencia));
      await repositorio.guardar(conciliacion);
      return consultas.obtener(conciliacionId);
    });
  }
}
