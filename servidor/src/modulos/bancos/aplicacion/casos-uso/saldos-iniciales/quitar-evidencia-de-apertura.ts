import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { SaldoInicialSinEvidencia } from '../../errores-de-estado-de-cuenta.js';
import {
  abrirEscritura,
  RECURSO_DE_SALDOS_INICIALES,
  type DependenciasDeSaldosIniciales,
} from './dependencias-de-saldos-iniciales.js';

/** Quita la evidencia de la apertura de una cuenta, con la carga abierta: borra el archivo y deja rastro. */
export class QuitarEvidenciaDeApertura {
  constructor(private readonly dependencias: DependenciasDeSaldosIniciales) {}

  /**
   * @throws SinFechaDeInicio, CargaInicialCerrada; RecursoNoEncontrado si la cuenta no tiene saldo inicial;
   *   SaldoInicialSinEvidencia (404) si no tiene archivo.
   */
  ejecutar(operador: Operador, cuentaBancariaId: string): Promise<void> {
    const { unidadDeTrabajo, consultas, cabeceras, documentos, auditoria } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const { cabecera } = await abrirEscritura(this.dependencias, operador, cuentaBancariaId);
      if (!cabecera) throw new RecursoNoEncontrado('El saldo inicial');
      if (!cabecera.evidenciaArchivoId) throw new SaldoInicialSinEvidencia();
      const anterior = await consultas.evidenciaDe(cuentaBancariaId);
      await cabeceras.ponerEvidencia(cabecera.id, null);
      await documentos.eliminar(cabecera.evidenciaArchivoId, RECURSO_DE_SALDOS_INICIALES);
      await auditoria.registrar({
        recurso: RECURSO_DE_SALDOS_INICIALES,
        registroId: cabecera.id,
        accion: 'quitar',
        anterior: { evidencia: anterior },
      });
    });
  }
}
