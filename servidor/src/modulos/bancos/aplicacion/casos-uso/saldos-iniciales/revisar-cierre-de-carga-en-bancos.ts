import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { HallazgoDeCierre } from '../../../dominio/hallazgos-de-cierre.js';
import type { DependenciasDeLecturaDeSaldos } from './listar-saldos-iniciales.js';

/**
 * La revisión de Bancos al cerrar la carga inicial (§5.6): una lista de hallazgos por cuenta. Cerrar con diferencias
 * o sin el dato es confirmación con motivo, no bloqueo; juntar las revisiones de los módulos y pedir el motivo es de
 * Empresas (EM-2). Mientras tanto la pantalla de saldos iniciales muestra estos mismos hallazgos.
 */
export class RevisarCierreDeCargaEnBancos {
  constructor(private readonly dependencias: DependenciasDeLecturaDeSaldos) {}

  ejecutar(operador: Operador): Promise<HallazgoDeCierre[]> {
    const { unidadDeTrabajo, ficha } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, () => ficha.revision(operador));
  }
}
