import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { aCentavos } from '../../../../core/compartido/dominio/centavos.js';
import { RetiroLiquidadoEvento } from '../../../dominio/eventos-de-retiros.js';
import {
  exigirFechaDeLiquidacion,
  exigirLiquidacionCuadrada,
  type LiquidacionPedida,
} from '../../../dominio/liquidacion-de-retiro.js';
import { exigirRetiroAbierto } from '../../../dominio/reglas-del-retiro.js';
import { RECURSO_DE_RETIROS, type RetiroDeEfectivo } from '../../../dominio/retiros.js';
import type { RetiroDto } from '../../dto/retiros.dto.js';
import type { MovimientoCreado } from '../../puertos/puertos-de-pagos.js';
import { avisosDeLiquidar } from './armado-del-retiro.js';
import { retiroBloqueado } from './bloqueo-del-retiro.js';
import type { DependenciasDeRetiros } from './dependencias-de-retiros.js';
import { DesgloseDelRetiro } from './desglose-del-retiro.js';
import { LectorDelRetiro } from './lector-del-retiro.js';
import { depositarElSobrante } from './deposito-del-retiro.js';

export interface PeticionParaLiquidarRetiro {
  retiroId: string;
  /** `AAAA-MM-DD`: hoy si falta; ni futura ni anterior al retiro o a su último pago. */
  fecha?: string;
  /** Lo que se deposita de vuelta, con dos decimales. */
  devuelto: string;
  /** La cuenta del depósito; por omisión la del retiro. */
  cuentaBancariaId?: string;
  /** El número de la boleta de depósito. */
  referencia?: string | null;
  /** Lo que falta, con dos decimales; con su motivo. */
  faltante: string;
  motivoDeFaltante?: string | null;
}

/** La liquidación ya revisada: lo que se guarda y cuándo. */
interface Liquidacion extends LiquidacionPedida {
  fecha: string;
}

/**
 * Liquida un retiro abierto (`retiros.liquidar`): lo que no se pagó (`monto` menos los pagos vigentes) se devuelve (un
 * depósito en Bancos, sin flujo) o se declara faltante con su motivo (flujo de Operación; Contabilidad decide la cuenta).
 * Lo devuelto más el faltante debe ser todo el sobrante. Deja el retiro `liquidado`, vuelve a fijar el reparto por concepto
 * del cheque o la nota, audita `ajustar` solo si hay faltante y publica `retiro_liquidado` al confirmar. Si quien liquida es
 * el custodio, lo avisa (no bloquea).
 */
export class LiquidarRetiro {
  private readonly lector: LectorDelRetiro;
  private readonly desglose: DesgloseDelRetiro;

  constructor(private readonly dependencias: DependenciasDeRetiros) {
    this.lector = new LectorDelRetiro(dependencias);
    this.desglose = new DesgloseDelRetiro(dependencias);
  }

  /**
   * @throws RecursoNoEncontrado, RetiroYaAnulado, RetiroLiquidado, LiquidacionNoCuadra, MotivoDeFaltanteObligatorio,
   * FechaDeLiquidacionInvalida y lo que rechace Bancos al registrar el depósito.
   */
  async ejecutar(operador: Operador, pedido: PeticionParaLiquidarRetiro): Promise<RetiroDto> {
    const { unidadDeTrabajo, publicadorEventos } = this.dependencias;
    const { dto, evento } = await unidadDeTrabajo.ejecutar(operador, () => this.liquidar(operador, pedido));
    await publicadorEventos.publicar([evento]);
    return dto;
  }

  private async liquidar(operador: Operador, pedido: PeticionParaLiquidarRetiro) {
    const retiro = await retiroBloqueado(this.dependencias, pedido.retiroId);
    exigirRetiroAbierto(retiro);
    const anterior = await this.lector.leer(operador, retiro);
    const liquidacion = await this.revisar(operador, retiro, pedido);
    const deposito = await depositarElSobrante(this.dependencias, operador, { retiro, pedido, liquidacion });
    const liquidado = await this.guardar(operador, retiro, { liquidacion, deposito, anterior });
    return this.respuesta(operador, liquidado, deposito);
  }

  /** Deja el retiro liquidado, vuelve a fijar su reparto por concepto y, si hay faltante, lo audita como `ajustar`. */
  private async guardar(
    operador: Operador,
    retiro: RetiroDeEfectivo,
    {
      liquidacion,
      deposito,
      anterior,
    }: { liquidacion: Liquidacion; deposito: MovimientoCreado | null; anterior: RetiroDto },
  ): Promise<RetiroDeEfectivo> {
    const { retiros } = this.dependencias;
    await retiros.liquidar(retiro.id, {
      liquidadoPor: operador.usuarioId,
      fechaDeLiquidacion: liquidacion.fecha,
      devueltoCentavos: liquidacion.devueltoCentavos,
      movimientoDeDevolucionId: deposito?.movimientoId ?? null,
      faltanteCentavos: liquidacion.faltanteCentavos,
      motivoDeFaltante: liquidacion.motivoDeFaltante,
    });
    const liquidado = (await retiros.buscar(retiro.id))!;
    await this.desglose.fijar(operador, liquidado);
    if (liquidacion.faltanteCentavos > 0)
      await this.auditarElFaltante(retiro.id, { anterior, motivo: liquidacion.motivoDeFaltante });
    return liquidado;
  }

  /** El faltante es un ajuste del retiro: queda en la auditoría con el retiro como estaba y el motivo. */
  private auditarElFaltante(retiroId: string, { anterior, motivo }: { anterior: RetiroDto; motivo: string | null }) {
    return this.dependencias.auditoria.registrar({
      recurso: RECURSO_DE_RETIROS,
      registroId: retiroId,
      accion: 'ajustar',
      anterior,
      motivo,
    });
  }

  /** Lo devuelto y el faltante cuadran con el sobrante y la fecha es válida; devuelve la liquidación lista para guardar. */
  private async revisar(operador: Operador, retiro: RetiroDeEfectivo, pedido: PeticionParaLiquidarRetiro) {
    const { consultas, reloj } = this.dependencias;
    const vigentes = (await consultas.pagosDelRetiro(retiro.id)).filter(({ estado }) => estado === 'vigente');
    const sobranteCentavos = vigentes.reduce((resto, { montoCentavos }) => resto - montoCentavos, retiro.montoCentavos);
    const pedida = {
      devueltoCentavos: aCentavos(pedido.devuelto),
      faltanteCentavos: aCentavos(pedido.faltante),
      motivoDeFaltante: pedido.motivoDeFaltante ?? null,
    };
    const motivoDeFaltante = exigirLiquidacionCuadrada(sobranteCentavos, pedida);
    const hoy = await reloj.hoy(operador);
    const minima = vigentes.reduce((mayor, { fecha }) => (fecha > mayor ? fecha : mayor), retiro.fecha);
    const fecha = pedido.fecha ?? hoy;
    exigirFechaDeLiquidacion(fecha, { minima, hoy });
    return { ...pedida, motivoDeFaltante, fecha } satisfies Liquidacion;
  }

  private async respuesta(operador: Operador, liquidado: RetiroDeEfectivo, deposito: MovimientoCreado | null) {
    const avisos = [
      ...(deposito?.avisos.map(({ mensaje }) => mensaje) ?? []),
      ...avisosDeLiquidar(liquidado, operador.usuarioId),
    ];
    const evento = new RetiroLiquidadoEvento({
      empresaId: operador.empresaId,
      retiroId: liquidado.id,
      numero: liquidado.numero,
      fecha: liquidado.fechaDeLiquidacion!,
      devueltoCentavos: liquidado.devueltoCentavos,
      faltanteCentavos: liquidado.faltanteCentavos,
      movimientoDeDevolucionId: liquidado.movimientoDeDevolucionId,
    });
    return { dto: await this.lector.leer(operador, liquidado, avisos), evento };
  }
}
