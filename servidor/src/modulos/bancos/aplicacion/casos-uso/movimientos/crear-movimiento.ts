import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { CuentaBancariaInactiva } from '../../../dominio/errores.js';
import { CuentasPorPagarInactivo, NotaNoMarcable } from '../../../dominio/errores-de-origen.js';
import { CLAVE_DE_PAGO_A_PROVEEDORES } from '../../../dominio/asignacion-de-concepto.js';
import { exigirInteresesCoherentes } from '../../../dominio/intereses.js';
import { Movimiento } from '../../../dominio/movimiento.js';
import { numerarSiCorresponde } from '../../numeracion-de-comprobantes.js';
import type { MovimientoDto, SolicitudDeMovimiento } from '../../dto/movimiento.dto.js';
import type { RepartoResuelto } from '../../desglose-de-movimientos.js';
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
      const { movimiento, reparto } = await this.nuevoMovimiento(operador, solicitud);
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
      if (reparto) await this.guardarElReparto(operador, movimiento, reparto);
      return consultas.obtener(movimiento.id.valor);
    });
  }

  private guardarElReparto(operador: Operador, movimiento: Movimiento, reparto: RepartoResuelto) {
    return this.dependencias.desglose.guardar(operador, {
      movimientoId: movimiento.id.valor,
      conceptoDelMovimientoId: movimiento.instantanea().conceptoId,
      reparto,
    });
  }

  /** El saldo inicial lleva su concepto de sistema; una nota, el que se eligió, el de la marca o el del reparto de otro módulo. */
  private async nuevoMovimiento(
    operador: Operador,
    solicitud: SolicitudDeMovimiento,
  ): Promise<{ movimiento: Movimiento; reparto: RepartoResuelto | null }> {
    const { conceptoId, pideIntereses, reparto } = await this.conceptoDe(operador, solicitud);
    exigirInteresesCoherentes(solicitud, pideIntereses);
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    const { origen, conceptos: _conceptos, marcarParaCuentasPorPagar: _marca, ...datos } = solicitud;
    const movimiento = Movimiento.crear(empresaId, { ...datos, conceptoId }, { origen });
    return { movimiento, reparto };
  }

  private async conceptoDe(operador: Operador, solicitud: SolicitudDeMovimiento) {
    const { conceptos, desglose } = this.dependencias;
    if (solicitud.origen) {
      const { tipo, monto } = solicitud;
      const reparto = await desglose.resolver(operador, { tipo, monto, lineas: solicitud.conceptos ?? [] });
      return { conceptoId: reparto.principalId, pideIntereses: false, reparto };
    }
    const concepto = solicitud.saldoInicial
      ? await conceptos.deSistema(operador, 'saldo_inicial')
      : await this.conceptoDeLaNota(operador, solicitud);
    return { conceptoId: concepto.id.valor, pideIntereses: concepto.instantanea().pideDatosDeIntereses, reparto: null };
  }

  /** Una nota marcada lleva el concepto «Pago a proveedores» (la marca); las demás, el que eligió el usuario. */
  private async conceptoDeLaNota(operador: Operador, solicitud: SolicitudDeMovimiento) {
    const { conceptos, cuentasPorPagar } = this.dependencias;
    if (!solicitud.marcarParaCuentasPorPagar) return conceptos.elegido(solicitud.conceptoId, solicitud.tipo);
    if (solicitud.tipo !== 'debito') throw new NotaNoMarcable();
    if (!(await cuentasPorPagar.estaActivo(operador))) throw new CuentasPorPagarInactivo();
    return conceptos.deSistema(operador, CLAVE_DE_PAGO_A_PROVEEDORES);
  }
}
