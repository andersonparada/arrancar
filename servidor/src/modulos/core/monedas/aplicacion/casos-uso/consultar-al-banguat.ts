import { FuenteNoDisponible, RespuestaInvalida } from '../../dominio/errores.js';
import { evaluarVariaciones } from '../../dominio/evaluar-variaciones.js';
import { sumarDiasAFecha } from '../../dominio/fechas-de-publicacion.js';
import type {
  MonedaPedida,
  PublicacionDeTipoDeCambio,
  PublicacionRechazada,
  ResultadoDeConsulta,
} from '../../dominio/publicacion.js';
import type { FuenteDeTiposDeCambio } from '../puertos/fuente-de-tipos-de-cambio.js';
import type {
  CargasDeTipos,
  ConsultaHecha,
  OperacionDelBanguat,
  ResultadoDeLaConsulta,
  VueltaDeCarga,
} from '../puertos/cargas-de-tipos.js';

/** El dólar se pide con reintentos; las demás monedas, una sola vez (lo que falte lo trae la vuelta siguiente). */
export interface FuentesDeCarga {
  dolar: FuenteDeTiposDeCambio;
  demas: FuenteDeTiposDeCambio;
}

interface Dependencias {
  fuentes: FuentesDeCarga;
  cargas: CargasDeTipos;
  ahora: () => Date;
}

/** Una llamada al Banguat: qué operación, de qué moneda y de qué fechas (`TipoCambioDia` pide solo hoy). */
export interface PedidoAlBanguat {
  vuelta: VueltaDeCarga;
  operacion: Extract<OperacionDelBanguat, 'TipoCambioDia' | 'TipoCambioRango' | 'TipoCambioRangoMoneda'>;
  moneda: MonedaPedida;
  hoy: string;
  desde: string;
  hasta: string;
  disparadaPor?: string | null;
}

/** Lo que dejó la llamada, para que quien orquesta decida y para la respuesta de «Cargar ahora». */
export interface ResumenDeConsulta {
  moneda: string;
  resultado: ResultadoDeLaConsulta;
  filasNuevas: number;
  filasRechazadas: number;
  desde: string;
  hasta: string;
}

const CODIGO_DEL_DOLAR = 2;
const DIAS_DEL_VALOR_ANTERIOR = 7;
const LARGO_DEL_DETALLE = 500;

/**
 * Hace una llamada al Banguat, valida y compara lo recibido, y deja la fila de la bitácora junto con lo nuevo en una
 * sola transacción. Un fallo de la fuente no lanza: queda en la bitácora como `error`.
 */
export class ConsultarAlBanguat {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(pedido: PedidoAlBanguat): Promise<ResumenDeConsulta> {
    const iniciadaEn = this.dependencias.ahora();
    try {
      const recibido = await this.pedir(pedido);
      return await this.guardar(pedido, iniciadaEn, recibido);
    } catch (error) {
      if (!(error instanceof FuenteNoDisponible || error instanceof RespuestaInvalida)) throw error;
      return this.dejarConstancia(pedido, iniciadaEn, { resultado: 'error', detalle: error.message });
    }
  }

  private pedir(pedido: PedidoAlBanguat): Promise<ResultadoDeConsulta> {
    const { moneda, hoy, desde, hasta } = pedido;
    const fuente =
      moneda.codigoBanguat === CODIGO_DEL_DOLAR ? this.dependencias.fuentes.dolar : this.dependencias.fuentes.demas;
    if (pedido.operacion === 'TipoCambioDia') return fuente.tipoDelDia({ hoy });
    if (pedido.operacion === 'TipoCambioRango') return fuente.tiposDelRango({ hoy, desde, hasta });
    return fuente.tiposDeLaMoneda({ ...moneda, hoy, desde, hasta });
  }

  private async guardar(
    pedido: PedidoAlBanguat,
    iniciadaEn: Date,
    recibido: ResultadoDeConsulta,
  ): Promise<ResumenDeConsulta> {
    const { cargas } = this.dependencias;
    const { moneda } = pedido.moneda;
    const propias = recibido.publicaciones.filter((p) => p.moneda === moneda);
    const conTipo = new Set(await cargas.fechasConTipoDelBanguat(moneda, pedido.desde, pedido.hasta));
    const nuevas = propias.filter((p) => !conTipo.has(p.fecha));
    const evaluacion = evaluarVariaciones({ publicaciones: nuevas, anterior: await this.anteriorDe(moneda, nuevas) });
    const rechazadas = [...recibido.rechazadas, ...evaluacion.rechazadas];
    const resultado = resultadoDe(propias.length, evaluacion.aGuardar.length, rechazadas);
    return this.dejarConstancia(pedido, iniciadaEn, {
      resultado,
      rechazadas,
      detalle: detalleDe(rechazadas, evaluacion.avisos),
      publicaciones: evaluacion.aGuardar,
    });
  }

  private async anteriorDe(moneda: string, nuevas: readonly PublicacionDeTipoDeCambio[]): Promise<string | null> {
    const primera = nuevas.map((p) => p.fecha).sort()[0];
    if (!primera) return null;
    return this.dependencias.cargas.valorAnterior(moneda, sumarDiasAFecha(primera, -DIAS_DEL_VALOR_ANTERIOR), primera);
  }

  private async dejarConstancia(
    pedido: PedidoAlBanguat,
    iniciadaEn: Date,
    hallazgo: Hallazgo,
  ): Promise<ResumenDeConsulta> {
    const consulta = consultaDe(pedido, { iniciadaEn, terminadaEn: this.dependencias.ahora() }, hallazgo);
    const filasNuevas = await this.dependencias.cargas.guardar(consulta, hallazgo.publicaciones ?? []);
    return {
      moneda: pedido.moneda.moneda,
      resultado: hallazgo.resultado,
      filasNuevas,
      filasRechazadas: consulta.filasRechazadas,
      desde: pedido.desde,
      hasta: pedido.hasta,
    };
  }
}

interface Hallazgo {
  resultado: ResultadoDeLaConsulta;
  detalle: string | null;
  rechazadas?: readonly PublicacionRechazada[];
  publicaciones?: readonly PublicacionDeTipoDeCambio[];
}

/** El resultado de la bitácora: si nada se guardó y algo se rechazó, el motivo del primer rechazo. */
function resultadoDe(
  recibidas: number,
  guardadas: number,
  rechazadas: readonly PublicacionRechazada[],
): ResultadoDeLaConsulta {
  const primera = rechazadas[0];
  if (guardadas === 0 && primera) return primera.motivo === 'dato_invalido' ? 'error' : primera.motivo;
  return recibidas === 0 && !primera ? 'sin_datos' : 'exito';
}

function detalleDe(rechazadas: readonly PublicacionRechazada[], avisos: readonly string[]): string | null {
  const lineas = [...rechazadas.map((r) => `${r.moneda} ${r.fecha}: ${r.motivo}`), ...avisos];
  return lineas.length > 0 ? lineas.join(' | ') : null;
}

/** La fila de la bitácora: `TipoCambioDia` puede traer varias monedas, así que no lleva moneda ni código. */
function consultaDe(
  pedido: PedidoAlBanguat,
  horas: { iniciadaEn: Date; terminadaEn: Date },
  hallazgo: Hallazgo,
): ConsultaHecha {
  const delDia = pedido.operacion === 'TipoCambioDia';
  return {
    ...horas,
    operacion: pedido.operacion,
    vuelta: pedido.vuelta,
    moneda: delDia ? null : pedido.moneda.moneda,
    codigoBanguat: delDia ? null : pedido.moneda.codigoBanguat,
    desde: pedido.desde,
    hasta: pedido.hasta,
    resultado: hallazgo.resultado,
    filasRechazadas: hallazgo.rechazadas?.length ?? 0,
    detalle: hallazgo.detalle?.slice(0, LARGO_DEL_DETALLE) ?? null,
    disparadaPor: pedido.disparadaPor ?? null,
  };
}
