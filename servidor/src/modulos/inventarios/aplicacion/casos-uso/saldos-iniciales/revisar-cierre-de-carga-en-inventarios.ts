import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { RevisionDeCierreDeModulo } from '../../../../core/contratos/empresas.contratos.js';
import { diaAnterior } from '../../../dominio/fechas.js';
import type { DependenciasDeSaldosIniciales } from './dependencias-de-saldos-iniciales.js';
import { revisionDeCierreDeInventarios } from './revision-de-cierre.js';

type Lectura = Pick<DependenciasDeSaldosIniciales, 'unidadDeTrabajo' | 'saldos'>;

/**
 * La revisión de Inventarios al cerrar la carga inicial (EM-2, §8): avisos y cifras de los saldos iniciales de la empresa
 * del operador, **de todas las bodegas** (no solo las que quien cierra ve). Empresas junta las revisiones de los módulos
 * activos. Nada de lo que encuentra pide motivo: son avisos.
 */
export class RevisarCierreDeCargaEnInventarios {
  constructor(private readonly dependencias: Lectura) {}

  ejecutar(operador: Operador, { fechaDeInicio }: { fechaDeInicio: string }): Promise<RevisionDeCierreDeModulo> {
    const { unidadDeTrabajo, saldos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () =>
      revisionDeCierreDeInventarios({
        resumen: await saldos.resumenParaLaRevision(fechaDeInicio),
        corte: diaAnterior(fechaDeInicio),
        hayConteos: await saldos.hayConteos(),
      }),
    );
  }
}
