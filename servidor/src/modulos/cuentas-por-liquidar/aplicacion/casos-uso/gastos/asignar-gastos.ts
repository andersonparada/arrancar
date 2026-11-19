import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { GastoNoDisponible } from '../../../dominio/errores-de-gastos.js';
import { estaEnLaBandeja, type Gasto } from '../../../dominio/gastos.js';
import type { AsignacionDeGastosDto, GastoDto } from '../../dto/gastos.dto.js';
import { anticipoAbiertoBloqueado } from './anticipo-abierto.js';
import { AsignadorDeGastos } from './asignador-de-gastos.js';
import type { DependenciasDeGastos } from './dependencias-de-gastos.js';
import { LectorDelGasto } from './lector-del-gasto.js';

export interface DocumentoParaAsignar {
  gastoId: string;
  /** Por omisión, la fecha del documento. */
  fecha?: string | undefined;
  motivoConRetencion?: string | null | undefined;
}

export interface PeticionParaAsignarGastos {
  anticipoId: string;
  documentos: readonly DocumentoParaAsignar[];
  /** El usuario tiene `cuentas-por-liquidar.gastos.con-retencion`. */
  puedeConRetencion: boolean;
}

/**
 * Asigna documentos de la bandeja a un anticipo abierto (`gastos.crear`, de 1 a 100 a la vez, todo o nada): uno por uno
 * (la bancarización de cada uno ve lo asignado antes), con la excepción de retención (§7.2): sin el permiso el documento con
 * retención no se asigna ni ninguno de la tanda; con él, hace falta un motivo y queda quién autorizó y la auditoría
 * `autorizar`. Publica `gasto_asignado` de cada uno al confirmar.
 */
export class AsignarGastos {
  private readonly asignador: AsignadorDeGastos;
  private readonly lector: LectorDelGasto;

  constructor(private readonly dependencias: DependenciasDeGastos) {
    this.asignador = new AsignadorDeGastos(dependencias);
    this.lector = new LectorDelGasto(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, AnticipoNoAbierto, GastoNoDisponible, FechaDelGastoInvalida, RetencionSinPermiso,
   * MotivoConRetencionObligatorio, MotivoConRetencionNoAplica
   */
  async ejecutar(operador: Operador, pedido: PeticionParaAsignarGastos): Promise<AsignacionDeGastosDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, eventos } = await unidadDeTrabajo.ejecutar(operador, () => this.asignar(operador, pedido));
    await publicadorEventos.publicar(eventos);
    return dto;
  }

  private async asignar(operador: Operador, pedido: PeticionParaAsignarGastos) {
    const anticipo = await anticipoAbiertoBloqueado(this.dependencias, pedido.anticipoId);
    const gastos: GastoDto[] = [];
    const eventos: EventoDominio[] = [];
    const avisos: string[] = [];
    for (const documento of pedido.documentos) {
      const gasto = await this.deLaBandeja(documento.gastoId);
      const hecho = await this.asignador.asignar(operador, anticipo, {
        ...documento,
        gasto,
        puedeConRetencion: pedido.puedeConRetencion,
      });
      gastos.push(await this.lector.leer(hecho.gasto, hecho.avisos));
      eventos.push(hecho.evento);
      avisos.push(...hecho.avisos);
    }
    return { dto: { gastos, avisos }, eventos };
  }

  private async deLaBandeja(gastoId: string): Promise<Gasto> {
    const gasto = await this.dependencias.gastos.bloquear(gastoId);
    if (!gasto || gasto.clase !== 'documento') throw new RecursoNoEncontrado('El documento');
    if (!estaEnLaBandeja(gasto))
      throw new GastoNoDisponible('Ese documento ya no está en la bandeja de Cuentas por liquidar.');
    return gasto;
  }
}
