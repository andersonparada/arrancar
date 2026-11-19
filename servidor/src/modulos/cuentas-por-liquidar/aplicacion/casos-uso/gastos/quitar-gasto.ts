import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { GastoNoDisponible } from '../../../dominio/errores-de-gastos.js';
import { eventoDeGastoQuitado } from '../../../dominio/eventos-de-gastos.js';
import { RECURSO_DE_GASTOS, type Gasto } from '../../../dominio/gastos.js';
import { motivoValido } from '../../../dominio/reglas-del-anticipo.js';
import { fechaDeQuitarElGasto } from '../../../dominio/reglas-del-gasto.js';
import type { GastoDto } from '../../dto/gastos.dto.js';
import { anticipoAbiertoBloqueado } from './anticipo-abierto.js';
import type { DependenciasDeGastos } from './dependencias-de-gastos.js';
import { LectorDelGasto } from './lector-del-gasto.js';

export interface PeticionParaQuitarGasto {
  gastoId: string;
  motivo: string;
}

/**
 * Quita un gasto de un anticipo abierto (`gastos.anular`): el documento vuelve a la bandeja (se limpian quién asignó y el
 * motivo de la retención; auditoría `corregir`) y el gasto sin documento queda anulado (auditoría `anular`), siempre con el
 * gasto como estaba y el motivo. Un anticipo liquidado no se toca: primero se reabre. Publica `gasto_quitado` al confirmar.
 */
export class QuitarGasto {
  private readonly lector: LectorDelGasto;

  constructor(private readonly dependencias: DependenciasDeGastos) {
    this.lector = new LectorDelGasto(dependencias);
  }

  /** @throws MotivoInvalido, RecursoNoEncontrado, GastoNoDisponible, AnticipoNoAbierto */
  async ejecutar(operador: Operador, pedido: PeticionParaQuitarGasto): Promise<GastoDto> {
    const motivo = motivoValido(pedido.motivo);
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, evento } = await unidadDeTrabajo.ejecutar(operador, () =>
      this.quitar(operador, pedido.gastoId, motivo),
    );
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async quitar(operador: Operador, gastoId: string, motivo: string) {
    const { gastos, auditoria, reloj } = this.dependencias;
    const gasto = await this.delAnticipo(gastoId);
    const anterior = await this.lector.leer(gasto);
    const vuelve = gasto.clase === 'documento';
    if (vuelve) await gastos.devolverALaBandeja(gasto.id, anterior.fechaDeEmision!);
    else {
      const fechaDeAnulacion = fechaDeQuitarElGasto(gasto, await reloj.hoy(operador));
      await gastos.anular(gasto.id, { anuladoPor: operador.usuarioId, motivo, fechaDeAnulacion });
    }
    const accion = vuelve ? 'corregir' : 'anular';
    await auditoria.registrar({ recurso: RECURSO_DE_GASTOS, registroId: gasto.id, accion, anterior, motivo });
    const despues = (await gastos.buscar(gasto.id))!;
    return {
      dto: await this.lector.leer(despues),
      evento: eventoDeGastoQuitado(operador.empresaId, gasto, vuelve),
    };
  }

  /** El gasto vigente de un anticipo abierto, con el anticipo bloqueado. */
  private async delAnticipo(gastoId: string): Promise<Gasto> {
    const { gastos } = this.dependencias;
    const encontrado = await gastos.buscar(gastoId);
    if (!encontrado) throw new RecursoNoEncontrado('El gasto');
    if (encontrado.anticipoId === null || encontrado.estado !== 'vigente') {
      throw new GastoNoDisponible('Ese gasto no está en un anticipo: no hay nada que quitar.');
    }
    await anticipoAbiertoBloqueado(this.dependencias, encontrado.anticipoId);
    const gasto = await gastos.bloquear(gastoId);
    if (!gasto || gasto.anticipoId === null || gasto.estado !== 'vigente') {
      throw new GastoNoDisponible('Ese gasto ya no está en el anticipo.');
    }
    return gasto;
  }
}
