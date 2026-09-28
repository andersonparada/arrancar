import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { ConciliacionDto } from '../../dto/conciliacion.dto.js';
import { conciliacionExistente, type DependenciasDeConciliaciones } from './dependencias-de-conciliaciones.js';

interface SolicitudDeSaldo {
  conciliacionId: string;
  saldoSegunBanco: string;
}

/** Corrige el saldo del estado de cuenta mientras la conciliación esté abierta. */
export class CambiarSaldoSegunBanco {
  constructor(private readonly dependencias: DependenciasDeConciliaciones) {}

  /** @throws ConciliacionCerrada si ya está cerrada. */
  ejecutar(operador: Operador, { conciliacionId, saldoSegunBanco }: SolicitudDeSaldo): Promise<ConciliacionDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const conciliacion = await conciliacionExistente(repositorio, conciliacionId);
      conciliacion.cambiarSaldoSegunBanco(saldoSegunBanco);
      await repositorio.guardar(conciliacion);
      return consultas.obtener(conciliacionId);
    });
  }
}
