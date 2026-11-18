import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { RevisionDeCierreDeModulo } from '../../../../core/contratos/empresas.contratos.js';
import { revisionDeCierreDeBancos } from '../../revision-de-cierre-para-empresas.js';
import type { ListarSaldosIniciales } from './listar-saldos-iniciales.js';

/**
 * Adaptador entre Empresas y los saldos iniciales: responde la pregunta «¿qué encontraste antes de cerrar la carga
 * inicial?» con lo mismo que muestra la pantalla de saldos iniciales, llevado al contrato de Empresas (EM-2).
 */
export class ResponderRevisionDeCierreDeCarga {
  constructor(private readonly saldos: Pick<ListarSaldosIniciales, 'ejecutar'>) {}

  /** @returns `null` si Bancos no tiene nada que decir (sin cuentas activas ni saldos iniciales). */
  async ejecutar(operador: Operador): Promise<RevisionDeCierreDeModulo | null> {
    return revisionDeCierreDeBancos(await this.saldos.ejecutar(operador));
  }
}
