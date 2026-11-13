import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConciliacionDto } from '../../dto/conciliacion.dto.js';
import { conciliacionExistente, type DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

interface SolicitudDeSaldo {
  conciliacionId: string;
  /** El saldo final del estado de cuenta con dos decimales, o `null` para borrarlo. */
  saldo: string | null;
}

/**
 * Guarda el saldo final que muestra el estado de cuenta del banco. Es un borrador de quien elabora
 * (solo se compara, no entra al cálculo), así que no se audita cada cambio.
 */
export class TranscribirSaldo {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /** @throws ConciliacionNoEstaEnProceso si ya no está en proceso. */
  ejecutar(operador: Operador, { conciliacionId, saldo }: SolicitudDeSaldo): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionExistente(repositorio, conciliacionId);
      conciliacion.transcribirSaldo(saldo);
      await repositorio.guardar(conciliacion);
      return consultas.obtener(conciliacionId);
    });
  }
}
