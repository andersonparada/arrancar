import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { UnidadDeTrabajo } from '../../../../core/compartido/aplicacion/unidad-de-trabajo.js';
import type { RevisionDeCierreDeModulo } from '../../../../core/contratos/empresas.contratos.js';
import { MODULO_CUENTAS_POR_PAGAR } from '../../../dominio/conceptos-reservados.js';
import type { ConsultasDeSaldosIniciales } from '../../puertos/consultas-de-saldos-iniciales.js';
import type { ModulosDeOrigen } from '../../puertos/modulos-de-origen.js';
import { revisionDeCierreDeBancos } from '../../revision-de-cierre-para-empresas.js';
import type { ListarSaldosIniciales } from './listar-saldos-iniciales.js';

export interface DependenciasDeLaRevisionDeCierre {
  saldos: Pick<ListarSaldosIniciales, 'ejecutar'>;
  consultas: Pick<ConsultasDeSaldosIniciales, 'posfechadosSinLigar'>;
  modulosDeOrigen: Pick<ModulosDeOrigen, 'estaActivo'>;
  unidadDeTrabajo: UnidadDeTrabajo;
}

/**
 * Adaptador entre Empresas y los saldos iniciales: responde la pregunta «¿qué encontraste antes de cerrar la carga
 * inicial?» con lo mismo que muestra la pantalla de saldos iniciales, llevado al contrato de Empresas (EM-2), y con el
 * aviso de los posfechados de apertura sin ligar cuando Cuentas por pagar está activo (AP-0).
 */
export class ResponderRevisionDeCierreDeCarga {
  constructor(private readonly dependencias: DependenciasDeLaRevisionDeCierre) {}

  /** @returns `null` si Bancos no tiene nada que decir (sin cuentas activas, saldos iniciales ni posfechados sin ligar). */
  async ejecutar(operador: Operador): Promise<RevisionDeCierreDeModulo | null> {
    const { saldos, consultas, modulosDeOrigen, unidadDeTrabajo } = this.dependencias;
    const saldosIniciales = await saldos.ejecutar(operador);
    const conCuentasPorPagar = await modulosDeOrigen.estaActivo(operador, MODULO_CUENTAS_POR_PAGAR);
    const posfechados = conCuentasPorPagar
      ? await unidadDeTrabajo.ejecutar(operador, () => consultas.posfechadosSinLigar())
      : undefined;
    return revisionDeCierreDeBancos(saldosIniciales, posfechados);
  }
}
