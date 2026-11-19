import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import type { EventoDominio } from '../../../../core/compartido/dominio/evento-dominio.js';
import { RECURSO_DE_ANTICIPOS, type Anticipo } from '../../../dominio/anticipos.js';
import { AVISO_DEL_BENEFICIARIO_QUE_LIQUIDA, liquidaElBeneficiario } from '../../../dominio/avisos-de-anticipos.js';
import { AnticipoLiquidado } from '../../../dominio/eventos-de-liquidacion.js';
import {
  exigirFechaDeLiquidacion,
  fechaMinimaDeLiquidacion,
  revisarLaLiquidacion,
  type LiquidacionRevisada,
} from '../../../dominio/liquidacion-del-anticipo.js';
import { exigirAnticipoAbierto } from '../../../dominio/reglas-del-anticipo.js';
import type { AnticipoDto } from '../../dto/anticipos.dto.js';
import type { LiquidacionDeAnticipo, RepartoDeLosGastos } from '../../puertos/puertos-de-anticipos.js';
import { anticipoBloqueado } from './bloqueo-del-anticipo.js';
import type { DependenciasDeAnticipos } from './dependencias-de-anticipos.js';
import { DesgloseDelAnticipo } from './desglose-del-anticipo.js';
import { LectorDelAnticipo } from './lector-del-anticipo.js';
import { ordenarLosMovimientos, type MovimientosDeLaLiquidacion } from './movimientos-de-la-liquidacion.js';
import type { PeticionParaLiquidarAnticipo } from './peticion-de-liquidacion.js';

/** La liquidación ya revisada con lo gastado y su fecha: lo que se guarda. */
interface LiquidacionLista {
  revisada: LiquidacionRevisada;
  gastos: RepartoDeLosGastos;
  fecha: string;
}

/** Lo que se escribe en el anticipo al liquidarlo. */
function liquidacionAGuardar(
  operador: Operador,
  por: { lista: LiquidacionLista; movimientos: MovimientosDeLaLiquidacion },
): LiquidacionDeAnticipo {
  const { revisada, fecha } = por.lista;
  return {
    liquidadoPor: operador.usuarioId,
    fechaDeLiquidacion: fecha,
    devueltoCentavos: revisada.devueltoCentavos,
    movimientoDeDevolucionId: por.movimientos.deposito?.movimientoId ?? null,
    reembolsadoCentavos: revisada.reembolsadoCentavos,
    movimientoDeReembolsoId: por.movimientos.reembolso?.movimientoId ?? null,
    noLiquidadoCentavos: revisada.noLiquidadoCentavos,
    destinoDeNoLiquidado: revisada.destino,
    cuotas: revisada.cuotas,
    motivoDeNoLiquidado: revisada.motivoDeNoLiquidado,
  };
}

/**
 * Liquida un anticipo abierto (`anticipos.liquidar`): con lo gastado, lo que falta por justificar se devuelve (nota de
 * crédito en Bancos, sin flujo) o se deja sin liquidar con su destino (cobrar en cuotas, renta del trabajo de un empleado, o
 * pérdida) y su motivo; si se gastó de más, se reembolsa con un cheque o una nota de débito. Vuelve a fijar el reparto por
 * concepto de la entrega, marca procesados los documentos del libro, audita `ajustar` solo si quedó algo sin liquidar y
 * publica `anticipo_liquidado` al confirmar. Si liquida el propio beneficiario, lo avisa (no bloquea).
 */
export class LiquidarAnticipo {
  private readonly lector: LectorDelAnticipo;
  private readonly desglose: DesgloseDelAnticipo;

  constructor(private readonly dependencias: DependenciasDeAnticipos) {
    this.lector = new LectorDelAnticipo(dependencias);
    this.desglose = new DesgloseDelAnticipo(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, AnticipoYaAnulado, AnticipoLiquidado, LiquidacionNoCuadra, DestinoDeNoLiquidadoObligatorio,
   * MotivoDeNoLiquidadoObligatorio, RentaDelTrabajoSoloEmpleados, CuotasInsuficientes, ReembolsoSinMedioDePago,
   * FechaDeLiquidacionInvalida y lo que rechace Bancos.
   */
  async ejecutar(operador: Operador, pedido: PeticionParaLiquidarAnticipo): Promise<AnticipoDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, evento } = await unidadDeTrabajo.ejecutar(operador, () => this.liquidar(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async liquidar(operador: Operador, pedido: PeticionParaLiquidarAnticipo) {
    const anticipo = await anticipoBloqueado(this.dependencias, pedido.anticipoId);
    exigirAnticipoAbierto(anticipo);
    const anterior = await this.lector.leer(operador, anticipo);
    const lista = await this.revisar(operador, anticipo, pedido);
    const movimientos = await ordenarLosMovimientos(this.dependencias, operador, { anticipo, pedido, ...lista });
    const liquidado = await this.guardar(operador, anticipo, { lista, movimientos, anterior });
    return this.respuesta(operador, liquidado, { lista, movimientos });
  }

  /** Lo pedido cuadra con lo que falta por justificar y la fecha es válida. */
  private async revisar(
    operador: Operador,
    anticipo: Anticipo,
    pedido: PeticionParaLiquidarAnticipo,
  ): Promise<LiquidacionLista> {
    const gastos = await this.dependencias.consultas.repartoDeLosGastos(anticipo.id);
    const revisada = revisarLaLiquidacion(anticipo, {
      porJustificarCentavos: anticipo.montoCentavos - gastos.totalCentavos,
      pedida: {
        devueltoCentavos: aCentavos(pedido.devuelto),
        noLiquidadoCentavos: aCentavos(pedido.noLiquidado),
        destino: pedido.destinoDeNoLiquidado ?? null,
        cuotas: pedido.cuotas ?? null,
        pagoVoluntario: pedido.pagoVoluntario ?? false,
        motivoDeNoLiquidado: pedido.motivoDeNoLiquidado ?? null,
      },
    });
    const hoy = await this.dependencias.reloj.hoy(operador);
    const fecha = pedido.fecha ?? hoy;
    exigirFechaDeLiquidacion(fecha, { minima: fechaMinimaDeLiquidacion(anticipo, gastos.ultimaFecha), hoy });
    return { revisada, gastos, fecha };
  }

  /** Deja el anticipo liquidado, fija el reparto de la entrega, marca los documentos y audita lo no liquidado. */
  private async guardar(
    operador: Operador,
    anticipo: Anticipo,
    por: { lista: LiquidacionLista; movimientos: MovimientosDeLaLiquidacion; anterior: AnticipoDto },
  ): Promise<Anticipo> {
    const { anticipos, documentos } = this.dependencias;
    await anticipos.liquidar(anticipo.id, liquidacionAGuardar(operador, por));
    const liquidado = (await anticipos.buscar(anticipo.id))!;
    await this.desglose.fijar(operador, liquidado);
    for (const documentoId of por.lista.gastos.documentosDeCompraIds)
      await documentos.marcarProcesado(operador, documentoId, true);
    await this.auditarLoNoLiquidado(liquidado, por.anterior);
    return liquidado;
  }

  /** Lo no liquidado es un ajuste: queda en la auditoría con el anticipo como estaba y el motivo. */
  private async auditarLoNoLiquidado(liquidado: Anticipo, anterior: AnticipoDto): Promise<void> {
    if (liquidado.noLiquidadoCentavos === 0) return;
    await this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_ANTICIPOS,
      registroId: liquidado.id,
      accion: 'ajustar',
      anterior,
      motivo: liquidado.motivoDeNoLiquidado,
    });
  }

  private async respuesta(
    operador: Operador,
    liquidado: Anticipo,
    { lista, movimientos }: { lista: LiquidacionLista; movimientos: MovimientosDeLaLiquidacion },
  ): Promise<{ dto: AnticipoDto; evento: EventoDominio }> {
    const avisos = [
      ...[movimientos.deposito, movimientos.reembolso].flatMap((movimiento) =>
        (movimiento?.avisos ?? []).map(({ mensaje }) => mensaje),
      ),
      ...(liquidaElBeneficiario(liquidado.beneficiarioUsuarioId, operador.usuarioId)
        ? [AVISO_DEL_BENEFICIARIO_QUE_LIQUIDA]
        : []),
    ];
    return {
      dto: await this.lector.leer(operador, liquidado, avisos),
      evento: this.evento(operador, liquidado, lista.gastos),
    };
  }

  private evento(operador: Operador, anticipo: Anticipo, gastos: RepartoDeLosGastos): EventoDominio {
    return new AnticipoLiquidado({
      empresaId: operador.empresaId,
      anticipoId: anticipo.id,
      numero: anticipo.numero,
      fecha: anticipo.fechaDeLiquidacion!,
      beneficiarioId: anticipo.beneficiarioId,
      esEmpleado: anticipo.esEmpleado,
      montoCentavos: anticipo.montoCentavos,
      gastadoCentavos: gastos.totalCentavos,
      devueltoCentavos: anticipo.devueltoCentavos,
      movimientoDeDevolucionId: anticipo.movimientoDeDevolucionId,
      reembolsadoCentavos: anticipo.reembolsadoCentavos,
      movimientoDeReembolsoId: anticipo.movimientoDeReembolsoId,
      noLiquidadoCentavos: anticipo.noLiquidadoCentavos,
      destinoDeNoLiquidado: anticipo.destinoDeNoLiquidado,
      cuotas: anticipo.cuotas,
    });
  }
}
