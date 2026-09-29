import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { CuentaBancariaInactiva } from '../../../dominio/errores.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import { Transferencia } from '../../../dominio/transferencia.js';
import type { SolicitudDeTransferencia, TransferenciaDto } from '../../dto/transferencia.dto.js';
import type { DependenciasDeTransferencias } from './dependencias-de-transferencias.js';

interface NotasDeLaTransferencia {
  debito: Movimiento;
  credito: Movimiento;
}

/** Registra, en una sola operación, un débito en la cuenta de origen y un crédito en la de destino. */
export class RegistrarTransferencia {
  constructor(private readonly dependencias: DependenciasDeTransferencias) {}

  /**
   * @throws TransferenciaALaMismaCuenta si origen y destino son la misma cuenta; MontoInvalido si el monto no es mayor que cero.
   * @throws CuentaBancariaInactiva si alguna de las dos cuentas está inactiva.
   * @throws SaldoInicialNoEsElPrimero, MovimientoAntesDelSaldoInicial o SaldoInsuficiente (del origen).
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeTransferencia): Promise<TransferenciaDto> {
    const { unidadDeTrabajo, repositorio, repositorioMovimientos, consultas } = this.dependencias;
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const transferencia = Transferencia.crear(empresaId, solicitud);
      await this.exigirCuentasActivas(solicitud);
      const notas = await this.crearNotas(empresaId, transferencia.id.valor, solicitud);
      await this.revisarReglas(operador, solicitud, notas);
      await repositorio.agregar(transferencia);
      await repositorioMovimientos.agregar(notas.debito);
      await repositorioMovimientos.agregar(notas.credito);
      return consultas.obtener(transferencia.id.valor);
    });
  }

  private async exigirCuentasActivas(solicitud: SolicitudDeTransferencia): Promise<void> {
    const { consultasMovimientos } = this.dependencias;
    const [origenActiva, destinoActiva] = await Promise.all([
      consultasMovimientos.cuentaEstaActiva(solicitud.cuentaOrigenId),
      consultasMovimientos.cuentaEstaActiva(solicitud.cuentaDestinoId),
    ]);
    if (!origenActiva || !destinoActiva) throw new CuentaBancariaInactiva();
  }

  private async crearNotas(
    empresaId: Identificador<'Empresa'>,
    transferenciaId: string,
    solicitud: SolicitudDeTransferencia,
  ): Promise<NotasDeLaTransferencia> {
    const { nombreOrigen, nombreDestino } = await this.nombresDeLasCuentas(solicitud);
    const comunes = this.datosComunes(solicitud);
    const debito = {
      ...comunes,
      cuentaBancariaId: solicitud.cuentaOrigenId,
      tipo: 'debito' as const,
      beneficiario: `Transferencia a ${nombreDestino}`,
    };
    const credito = {
      ...comunes,
      cuentaBancariaId: solicitud.cuentaDestinoId,
      tipo: 'credito' as const,
      beneficiario: `Transferencia desde ${nombreOrigen}`,
    };
    return {
      debito: Movimiento.crear(empresaId, debito, { transferenciaId }),
      credito: Movimiento.crear(empresaId, credito, { transferenciaId }),
    };
  }

  private datosComunes(solicitud: SolicitudDeTransferencia) {
    return {
      fecha: solicitud.fecha,
      monto: solicitud.monto,
      saldoInicial: false,
      referencia: solicitud.referencia,
      observaciones: solicitud.observaciones,
    };
  }

  private async nombresDeLasCuentas(
    solicitud: SolicitudDeTransferencia,
  ): Promise<{ nombreOrigen: string; nombreDestino: string }> {
    const { consultasCuentasBancarias } = this.dependencias;
    const [nombreOrigen, nombreDestino] = await Promise.all([
      consultasCuentasBancarias.nombreDe(solicitud.cuentaOrigenId),
      consultasCuentasBancarias.nombreDe(solicitud.cuentaDestinoId),
    ]);
    return { nombreOrigen, nombreDestino };
  }

  private async revisarReglas(
    operador: Operador,
    solicitud: SolicitudDeTransferencia,
    { debito, credito }: NotasDeLaTransferencia,
  ): Promise<void> {
    const { reglas } = this.dependencias;
    const queda = { fecha: solicitud.fecha, saldoInicial: false };
    const fechas = [solicitud.fecha];
    await reglas.revisar(operador, {
      cuentaBancariaId: solicitud.cuentaOrigenId,
      queda,
      fechas,
      diferencia: debito.efectoEnCentavos,
    });
    await reglas.revisar(operador, {
      cuentaBancariaId: solicitud.cuentaDestinoId,
      queda,
      fechas,
      diferencia: credito.efectoEnCentavos,
    });
  }
}
