import { FuenteNoDisponible, RespuestaInvalida } from '../../dominio/errores.js';
import { evaluarVariaciones } from '../../dominio/evaluar-variaciones.js';
import { sumarDiasAFecha } from '../../dominio/fechas-de-publicacion.js';
import { normalizarPublicaciones, type DolarDelDia } from '../../dominio/normalizar-publicaciones.js';
import type { MonedaACargar, PublicacionDeTipoDeCambio, ResultadoDeConsulta } from '../../dominio/publicacion.js';
import type { FuenteDeTiposDeCambio } from '../puertos/fuente-de-tipos-de-cambio.js';
import type {
  CargasDeTipos,
  OperacionDelBanguat,
  ResultadoDeLaConsulta,
  VueltaDeCarga,
} from '../puertos/cargas-de-tipos.js';
import { consultaDe, detalleDe, resultadoDe, type Hallazgo } from './registro-de-la-consulta.js';

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
  moneda: MonedaACargar;
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

/**
 * Hace una llamada al Banguat, valida y compara lo recibido, y deja la fila de la bitácora junto con lo nuevo en una
 * sola transacción. Las comprobaciones son las de la adenda B.6, en orden: convención, formato y diferencial (en la
 * fuente), dólar de la misma fecha, inversión probable y variación. Un fallo de la fuente no lanza: queda en la
 * bitácora como `error`.
 */
export class ConsultarAlBanguat {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(pedido: PedidoAlBanguat): Promise<ResumenDeConsulta> {
    const iniciadaEn = this.dependencias.ahora();
    if (!pedido.moneda.convencion) {
      const detalle = `${pedido.moneda.moneda}: el código ${pedido.moneda.codigoBanguat} no tiene convención comprobada.`;
      return this.dejarConstancia(pedido, iniciadaEn, { resultado: 'sin_convencion', detalle });
    }
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
    return fuente.tiposDeLaMoneda({ moneda: moneda.moneda, codigoBanguat: moneda.codigoBanguat, hoy, desde, hasta });
  }

  private async guardar(
    pedido: PedidoAlBanguat,
    iniciadaEn: Date,
    recibido: ResultadoDeConsulta,
  ): Promise<ResumenDeConsulta> {
    const { cargas } = this.dependencias;
    const { moneda, convencion } = pedido.moneda;
    const propias = recibido.publicaciones.filter((p) => p.moneda === moneda);
    const conTipo = new Set(await cargas.fechasConTipoDelBanguat(moneda, pedido.desde, pedido.hasta));
    const nuevas = propias.filter((p) => !conTipo.has(p.fecha));
    const dolares = await this.dolaresDe(pedido);
    const normalizacion = normalizarPublicaciones({ publicaciones: nuevas, convencion: convencion!, dolares });
    const evaluacion = evaluarVariaciones({
      publicaciones: normalizacion.normalizadas,
      ...(await this.anterioresDe(pedido.moneda, normalizacion.normalizadas)),
    });
    const propiasRechazadas = recibido.rechazadas.filter((r) => r.moneda === moneda);
    const rechazadas = [...propiasRechazadas, ...normalizacion.rechazadas, ...evaluacion.rechazadas];
    return this.dejarConstancia(pedido, iniciadaEn, {
      resultado: resultadoDe(propias.length, evaluacion.aGuardar.length, rechazadas),
      rechazadas,
      detalle: detalleDe(rechazadas, evaluacion.avisos),
      publicaciones: evaluacion.aGuardar,
    });
  }

  /** El dólar del Banguat guardado de cada fecha pedida; el dólar mismo no lo necesita. */
  private async dolaresDe(pedido: PedidoAlBanguat): Promise<Map<string, DolarDelDia>> {
    if (pedido.moneda.convencion === 'quetzales_por_unidad') return new Map();
    const guardados = await this.dependencias.cargas.dolaresDelBanguat(pedido.desde, pedido.hasta);
    return new Map(guardados.map((d) => [d.fecha, { id: d.id, referencia: d.referencia }]));
  }

  /** Lo anterior contra lo que se compara: el valor en quetzales y, en los cruces, lo publicado en su convención. */
  private async anterioresDe(
    pedida: MonedaACargar,
    nuevas: readonly PublicacionDeTipoDeCambio[],
  ): Promise<{ anterior: string | null; anteriorPublicado: string | null }> {
    const primera = nuevas.map((p) => p.fecha).sort()[0];
    if (!primera) return { anterior: null, anteriorPublicado: null };
    const { cargas } = this.dependencias;
    const desde = sumarDiasAFecha(primera, -DIAS_DEL_VALOR_ANTERIOR);
    const anterior = await cargas.valorAnterior(pedida.moneda, desde, primera);
    if (pedida.convencion === 'quetzales_por_unidad') return { anterior, anteriorPublicado: null };
    const busqueda = { moneda: pedida.moneda, convencion: pedida.convencion!, desde, antesDe: primera };
    return { anterior, anteriorPublicado: await cargas.publicadoAnterior(busqueda) };
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
