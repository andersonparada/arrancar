import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { referenciaAutomaticaDeCheque, type Cheque } from '../../../dominio/cheque.js';
import type { Chequera } from '../../../dominio/chequera.js';
import { MovimientoAnulado, ChequeraInactiva } from '../../../dominio/errores.js';
import { NoSeBlanqueaUnChequeDeApertura } from '../../../dominio/errores-de-apertura.js';
import { ChequeNoSePasaDeFormulario, ConfirmacionDeCustodiaFaltante } from '../../../dominio/errores-de-impresion.js';
import type { ChequePasadoDto } from '../../dto/cheque.dto.js';
import { movimientoExistente } from '../movimientos/dependencias-de-movimientos.js';
import { chequeExistente, type DependenciasDeCheques } from './dependencias-de-cheques.js';

export interface PasoDeFormulario {
  chequeId: string;
  chequeDestinoId: string;
  motivo: string;
  /** «El formulario está en poder de la empresa: no se firmó ni se entregó.» */
  enCustodia: boolean;
  /** «Lo crucé con ANULADO, recorté la zona de firma y lo archivo con el comprobante de egreso.» */
  papelConservado: boolean;
}

/**
 * Pasa el pago de un cheque ya impreso a otro formulario cuando el papel quedó inservible **y sigue en la empresa**: en una
 * sola transacción el movimiento pasa al cheque destino (con su «no negociable») y el cheque viejo queda anulado como
 * `inutilizado`, sin movimiento. El movimiento y su pago de origen no cambian (no se avisa al módulo de origen); el destino
 * nace sin imprimir. Deja la auditoría `inutilizar` con el cheque como estaba, el número nuevo y las dos confirmaciones.
 * Si el papel salió de la custodia, no es inutilizado: es extraviado (anular con esa causa).
 */
export class PasarChequeAOtroFormulario {
  constructor(private readonly dependencias: DependenciasDeCheques) {}

  /**
   * @throws ConfirmacionDeCustodiaFaltante si falta una de las dos confirmaciones.
   * @throws ChequeNoSePasaDeFormulario si el cheque no está emitido e impreso, es de la carga inicial o el destino no sirve.
   * @throws MovimientoAnulado o MovimientoMarcadoEnConciliacion si su movimiento ya no está limpio.
   * @throws ChequeNoDisponible si el destino no está disponible; ChequeraInactiva si su chequera está inactiva.
   */
  ejecutar(operador: Operador, solicitud: PasoDeFormulario): Promise<ChequePasadoDto> {
    const { unidadDeTrabajo, repositorio, consultas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!solicitud.enCustodia || !solicitud.papelConservado) throw new ConfirmacionDeCustodiaFaltante();
      const origen = await chequeExistente(repositorio, solicitud.chequeId);
      const destino = await chequeExistente(repositorio, solicitud.chequeDestinoId);
      const anterior = await consultas.obtener(solicitud.chequeId);
      await this.exigirDestinoUsable(origen, destino);
      const movimientoId = origen.instantanea().movimientoId;
      await this.pasarElMovimiento(origen, destino, solicitud);
      await this.auditar(solicitud, { anterior, numeroNuevo: destino.instantanea().numero });
      return this.respuesta(solicitud, { movimientoId, anterior });
    });
  }

  /** El destino es otro cheque disponible de una chequera activa (no de la carga inicial) de la misma cuenta bancaria. */
  private async exigirDestinoUsable(origen: Cheque, destino: Cheque): Promise<void> {
    if (origen.id.esIgualA(destino.id)) throw new ChequeNoSePasaDeFormulario('Elija otro cheque como destino.');
    const deOrigen = await this.chequera(origen.instantanea().chequeraId);
    const deDestino = await this.chequera(destino.instantanea().chequeraId);
    if (deDestino.instantanea().cuentaBancariaId !== deOrigen.instantanea().cuentaBancariaId) {
      throw new ChequeNoSePasaDeFormulario('El cheque destino debe ser de la misma cuenta bancaria.');
    }
    if (deDestino.esDeApertura) {
      throw new ChequeNoSePasaDeFormulario('El cheque destino no puede ser de la carga inicial.');
    }
    if (!deDestino.estaActiva) throw new ChequeraInactiva();
  }

  private async chequera(chequeraId: string): Promise<Chequera> {
    const chequera = await this.dependencias.repositorioChequeras.buscar(Identificador.desde(chequeraId));
    if (!chequera) throw new RecursoNoEncontrado('La chequera');
    return chequera;
  }

  /** Inutiliza el cheque viejo y entrega su movimiento al destino, que nace sin imprimir. */
  private async pasarElMovimiento(origen: Cheque, destino: Cheque, solicitud: PasoDeFormulario): Promise<void> {
    const { repositorio, repositorioMovimientos, repositorioChequeras } = this.dependencias;
    const { movimientoId, numero, noNegociable, chequeraId } = origen.instantanea();
    origen.inutilizar(solicitud.motivo);
    const movimiento = await movimientoExistente(repositorioMovimientos, movimientoId as string);
    await this.exigirMovimientoLimpio(movimiento);
    const serieAntes = (await repositorioChequeras.buscar(Identificador.desde(chequeraId)))!.instantanea().serie;
    const { chequeraId: chequeraDestino, numero: numeroNuevo } = destino.instantanea();
    const serieNueva = (await repositorioChequeras.buscar(Identificador.desde(chequeraDestino)))!.instantanea().serie;
    destino.emitir(movimientoId as string, noNegociable);
    movimiento.actualizarReferenciaAutomatica(
      referenciaAutomaticaDeCheque(serieAntes, numero),
      referenciaAutomaticaDeCheque(serieNueva, numeroNuevo),
    );
    await repositorio.guardar(origen);
    await repositorio.guardar(destino);
    await repositorioMovimientos.guardar(movimiento);
  }

  /** Su movimiento está vigente, no es de la carga inicial y ningún banco lo ha marcado en una conciliación. */
  private async exigirMovimientoLimpio(movimiento: Awaited<ReturnType<typeof movimientoExistente>>): Promise<void> {
    if (movimiento.parteDeApertura !== null) throw new NoSeBlanqueaUnChequeDeApertura();
    if (movimiento.estaAnulado) throw new MovimientoAnulado();
    const { conciliacionId } = await this.dependencias.consultasMovimientos.obtener(movimiento.id.valor);
    movimiento.exigirNoMarcadoEnConciliacion(conciliacionId);
  }

  private auditar(
    solicitud: PasoDeFormulario,
    { anterior, numeroNuevo }: { anterior: ChequePasadoDto['inutilizado']; numeroNuevo: number },
  ): Promise<void> {
    const { chequeId, chequeDestinoId, enCustodia, papelConservado, motivo } = solicitud;
    return this.dependencias.auditoria.registrar({
      recurso: 'bancos.cheques',
      registroId: chequeId,
      accion: 'inutilizar',
      anterior: { ...anterior, pasoAOtroFormulario: { chequeDestinoId, numeroNuevo, enCustodia, papelConservado } },
      motivo: motivo.trim(),
    });
  }

  private async respuesta(
    solicitud: PasoDeFormulario,
    { movimientoId, anterior }: { movimientoId: string | null; anterior: ChequePasadoDto['inutilizado'] },
  ): Promise<ChequePasadoDto> {
    const { consultas, consultasMovimientos } = this.dependencias;
    const inutilizado = await consultas.obtener(solicitud.chequeId);
    const destino = await consultas.obtener(solicitud.chequeDestinoId);
    const delMovimiento = movimientoId ? await consultasMovimientos.obtener(movimientoId) : null;
    const avisos = delMovimiento?.moduloDeOrigen
      ? [
          `Si ya entregó el comprobante de pago con el cheque ${anterior.numero}, reimprímalo: ahora es el cheque ${destino.numero}.`,
        ]
      : [];
    return { inutilizado, destino, avisos };
  }
}
