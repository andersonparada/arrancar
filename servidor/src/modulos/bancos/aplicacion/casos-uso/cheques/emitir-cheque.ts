import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { BeneficiarioObligatorio, ChequeraInactiva, CuentaBancariaInactiva } from '../../../dominio/errores.js';
import type { Chequera } from '../../../dominio/chequera.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import type { SolicitudDeEmisionDeCheque } from '../../dto/cheque.dto.js';
import type { MovimientoDto } from '../../dto/movimiento.dto.js';
import { chequeExistente, type DependenciasDeCheques } from './dependencias-de-cheques.js';

/** Emite el cheque: crea su movimiento en la cuenta de la chequera y lo marca emitido. */
export class EmitirCheque {
  constructor(private readonly dependencias: DependenciasDeCheques) {}

  /**
   * @throws ChequeNoDisponible si el cheque no está disponible.
   * @throws ChequeraInactiva si su chequera está inactiva; CuentaBancariaInactiva si la cuenta está inactiva.
   * @throws BeneficiarioObligatorio si no se escribió el beneficiario.
   * @throws SaldoInicialNoEsElPrimero, MovimientoAntesDelSaldoInicial o SaldoInsuficiente.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeEmisionDeCheque): Promise<MovimientoDto> {
    const { unidadDeTrabajo, repositorio, repositorioMovimientos, consultasMovimientos, reglas } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      if (!solicitud.beneficiario.trim()) throw new BeneficiarioObligatorio();
      const cheque = await chequeExistente(repositorio, solicitud.chequeId);
      const chequera = await this.chequeraActiva(cheque.instantanea().chequeraId);
      const { cuentaBancariaId } = chequera.instantanea();
      if (!(await consultasMovimientos.cuentaEstaActiva(cuentaBancariaId))) throw new CuentaBancariaInactiva();

      const movimiento = this.nuevoMovimiento(operador, solicitud, {
        chequera,
        numeroDeCheque: cheque.instantanea().numero,
      });
      await reglas.revisar(operador, {
        cuentaBancariaId,
        queda: { fecha: solicitud.fecha, saldoInicial: false },
        fechas: [solicitud.fecha],
        diferencia: movimiento.efectoEnCentavos,
      });

      cheque.emitir(movimiento.id.valor, solicitud.noNegociable);
      await repositorioMovimientos.agregar(movimiento);
      await repositorio.guardar(cheque);
      return consultasMovimientos.obtener(movimiento.id.valor);
    });
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
    { chequera, numeroDeCheque }: { chequera: Chequera; numeroDeCheque: number },
  ): Movimiento {
    const { cuentaBancariaId, serie } = chequera.instantanea();
    const referencia = solicitud.referencia?.trim() || `Cheque ${serie ?? ''}${numeroDeCheque}`;
    return Movimiento.crear(Identificador.desde<'Empresa'>(operador.empresaId), {
      cuentaBancariaId,
      tipo: 'cheque',
      fecha: solicitud.fecha,
      monto: solicitud.monto,
      saldoInicial: false,
      referencia,
      beneficiario: solicitud.beneficiario.trim(),
      observaciones: solicitud.observaciones,
    });
  }
}
