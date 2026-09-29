import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { CuentaBancariaInactiva } from '../../../dominio/errores.js';
import { exigirInteresesCoherentes } from '../../../dominio/intereses.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import { numerarSiCorresponde } from '../../numeracion-de-comprobantes.js';
import type { MovimientoDto, SolicitudDeMovimiento } from '../../dto/movimiento.dto.js';
import type { DependenciasDeMovimientos } from './dependencias-de-movimientos.js';

/** Registra una nota de crédito o de débito (o el saldo inicial) en una cuenta activa. */
export class CrearMovimiento {
  constructor(private readonly dependencias: DependenciasDeMovimientos) {}

  /**
   * @throws CuentaBancariaInactiva si la cuenta está inactiva.
   * @throws ConceptoObligatorio, ConceptoDeSistemaNoSeElige, ConceptoInactivo o ConceptoIncompatible si el concepto no sirve.
   * @throws DatosDeInteresesObligatorios, DatosDeInteresesNoAplican o InteresesNoCuadran si los intereses no van con el concepto.
   * @throws SaldoInicialRepetido, SaldoInicialNoEsElPrimero, MovimientoAntesDelSaldoInicial o SaldoInsuficiente.
   */
  ejecutar(operador: Operador, solicitud: SolicitudDeMovimiento): Promise<MovimientoDto> {
    const { unidadDeTrabajo, repositorio, consultas, reglas, correlativos } = this.dependencias;
    return unidadDeTrabajo.ejecutar(operador, async () => {
      const movimiento = await this.nuevoMovimiento(operador, solicitud);
      await consultas.exigirReferencias(solicitud);
      if (!(await consultas.cuentaEstaActiva(solicitud.cuentaBancariaId))) throw new CuentaBancariaInactiva();
      await reglas.revisar(operador, {
        cuentaBancariaId: solicitud.cuentaBancariaId,
        queda: solicitud,
        fechas: [solicitud.fecha],
        diferencia: movimiento.efectoEnCentavos,
      });
      await numerarSiCorresponde(correlativos, movimiento);
      await repositorio.agregar(movimiento);
      return consultas.obtener(movimiento.id.valor);
    });
  }

  /** El saldo inicial lleva su concepto de sistema; una nota, el que el usuario eligió. */
  private async nuevoMovimiento(operador: Operador, solicitud: SolicitudDeMovimiento): Promise<Movimiento> {
    const { conceptos } = this.dependencias;
    const concepto = solicitud.saldoInicial
      ? await conceptos.deSistema(operador, 'saldo_inicial')
      : await conceptos.elegido(solicitud.conceptoId, solicitud.tipo);
    exigirInteresesCoherentes(solicitud, concepto.instantanea().pideDatosDeIntereses);
    return Movimiento.crear(Identificador.desde(operador.empresaId), { ...solicitud, conceptoId: concepto.id.valor });
  }
}
