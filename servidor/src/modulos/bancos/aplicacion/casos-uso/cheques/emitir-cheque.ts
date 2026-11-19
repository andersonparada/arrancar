import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { BeneficiarioObligatorio, ChequeraInactiva, CuentaBancariaInactiva } from '../../../dominio/errores.js';
import type { Cheque } from '../../../dominio/cheque.js';
import type { Chequera } from '../../../dominio/chequera.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import type { ChequeEmitidoDto, SolicitudDeEmisionDeCheque } from '../../dto/cheque.dto.js';
import { AvisoDeFondosDePosfechados } from '../../aviso-de-fondos-de-posfechados.js';
import type { RepartoResuelto } from '../../desglose-de-movimientos.js';
import { chequeExistente, type DependenciasDeCheques } from './dependencias-de-cheques.js';

interface MovimientoRevisado {
  movimiento: Movimiento;
  /** El reparto por concepto, solo si lo emite otro módulo (con `origen`). */
  reparto: RepartoResuelto | null;
}

/**
 * Emite el cheque: crea su movimiento en la cuenta de la chequera y lo marca emitido. Con fecha posterior a hoy avisa
 * (sin bloquear) si la cuenta no tendría fondos para cubrir los posfechados.
 */
export class EmitirCheque {
  private readonly fondos: AvisoDeFondosDePosfechados;

  constructor(private readonly dependencias: DependenciasDeCheques) {
    this.fondos = new AvisoDeFondosDePosfechados({
      consultas: dependencias.consultasMovimientos,
      reloj: dependencias.reloj,
    });
  }

  /**
   * @throws ChequeNoDisponible si el cheque no está disponible.
   * @throws ChequeraInactiva si su chequera está inactiva; CuentaBancariaInactiva si la cuenta está inactiva.
   * @throws BeneficiarioObligatorio si no se escribió el beneficiario.
   * @throws ConceptoObligatorio, ConceptoDeSistemaNoSeElige, ConceptoReservadoPorSuModulo, ConceptoInactivo o ConceptoIncompatible.
   * @throws SaldoInicialNoEsElPrimero, MovimientoAntesDelSaldoInicial o SaldoInsuficiente.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeEmisionDeCheque): Promise<ChequeEmitidoDto> {
    const { unidadDeTrabajo, repositorio, repositorioMovimientos, consultasMovimientos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!solicitud.beneficiario.trim()) throw new BeneficiarioObligatorio();
      const cheque = await chequeExistente(repositorio, solicitud.chequeId);
      const chequera = await this.chequeraActiva(cheque.instantanea().chequeraId);
      const { cuentaBancariaId } = chequera.instantanea();
      if (!(await consultasMovimientos.cuentaEstaActiva(cuentaBancariaId))) throw new CuentaBancariaInactiva();

      const { movimiento, reparto } = await this.nuevoMovimientoRevisado(operador, solicitud, { chequera, cheque });
      const avisos = await this.fondos.avisos(operador, {
        cuentaBancariaId,
        fecha: solicitud.fecha,
        monto: solicitud.monto,
      });

      cheque.emitir(movimiento.id.valor, solicitud.noNegociable);
      await repositorioMovimientos.agregar(movimiento);
      await repositorio.guardar(cheque);
      if (reparto) await this.guardarElReparto(operador, movimiento, reparto);
      return { ...(await consultasMovimientos.obtener(movimiento.id.valor)), avisos };
    });
  }

  private guardarElReparto(operador: Operador, movimiento: Movimiento, reparto: RepartoResuelto) {
    return this.dependencias.desglose.guardar(operador, {
      movimientoId: movimiento.id.valor,
      conceptoDelMovimientoId: movimiento.instantanea().conceptoId,
      reparto,
    });
  }

  /** El concepto lo elige el usuario (revisado con P3) o, si lo emite otro módulo, sale del reparto que trae. */
  private async conceptoDelCheque(operador: Operador, solicitud: SolicitudDeEmisionDeCheque) {
    if (solicitud.origen) {
      const lineas = solicitud.conceptos ?? [];
      const reparto = await this.dependencias.desglose.resolver(operador, {
        tipo: 'cheque',
        monto: solicitud.monto,
        lineas,
      });
      return { conceptoId: reparto.principalId, reparto };
    }
    const modulosActivos = await this.dependencias.modulosDeOrigen.activos(operador);
    const concepto = await this.dependencias.conceptos.elegido(solicitud.conceptoId, 'cheque', { modulosActivos });
    return { conceptoId: concepto.id.valor, reparto: null };
  }

  /** Elige el concepto, arma el movimiento del cheque y revisa las reglas de la cuenta. */
  private async nuevoMovimientoRevisado(
    operador: Operador,
    solicitud: SolicitudDeEmisionDeCheque,
    { chequera, cheque }: { chequera: Chequera; cheque: Cheque },
  ): Promise<MovimientoRevisado> {
    const { conceptoId, reparto } = await this.conceptoDelCheque(operador, solicitud);
    const movimiento = this.nuevoMovimiento(operador, solicitud, {
      chequera,
      numeroDeCheque: cheque.instantanea().numero,
      conceptoId,
    });
    const { cuentaBancariaId } = chequera.instantanea();
    await this.dependencias.reglas.revisar(operador, {
      cuentaBancariaId,
      queda: { fecha: solicitud.fecha, saldoInicial: false },
      fechas: [solicitud.fecha],
      diferencia: movimiento.efectoEnCentavos,
    });
    return { movimiento, reparto };
  }

  /** @throws RecursoNoEncontrado si la chequera no existe; ChequeraInactiva si está inactiva. */
  private async chequeraActiva(chequeraId: string): Promise<Chequera> {
    const chequera = await this.dependencias.repositorioChequeras.buscar(Identificador.desde(chequeraId));
    if (!chequera) throw new RecursoNoEncontrado('La chequera');
    if (!chequera.estaActiva) throw new ChequeraInactiva();
    return chequera;
  }

  private nuevoMovimiento(
    operador: Operador,
    solicitud: SolicitudDeEmisionDeCheque,
    { chequera, numeroDeCheque, conceptoId }: { chequera: Chequera; numeroDeCheque: number; conceptoId: string },
  ): Movimiento {
    const { cuentaBancariaId, serie } = chequera.instantanea();
    const referencia = solicitud.referencia?.trim() || `Cheque ${serie ?? ''}${numeroDeCheque}`;
    const datos = {
      cuentaBancariaId,
      tipo: 'cheque' as const,
      fecha: solicitud.fecha,
      monto: solicitud.monto,
      saldoInicial: false,
      referencia,
      beneficiario: solicitud.beneficiario.trim(),
      observaciones: solicitud.observaciones,
      conceptoId,
    };
    const vinculos = { origen: solicitud.origen, paraAbonoEnCuenta: solicitud.paraAbonoEnCuenta ?? false };
    return Movimiento.crear(Identificador.desde<'Empresa'>(operador.empresaId), datos, vinculos);
  }
}
