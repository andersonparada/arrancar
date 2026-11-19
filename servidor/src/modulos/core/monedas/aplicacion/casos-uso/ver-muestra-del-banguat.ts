import { fechaLocalEn } from '../../../compartido/dominio/fecha-local.js';
import { CodigoDelBanguatNoOfrecido, FuenteNoDisponible, RespuestaInvalida } from '../../dominio/errores.js';
import { sumarDiasAFecha } from '../../dominio/fechas-de-publicacion.js';
import type { CargasDeTipos, ResultadoDeLaConsulta } from '../puertos/cargas-de-tipos.js';
import type { FuenteDeTiposDeCambio } from '../puertos/fuente-de-tipos-de-cambio.js';
import type { CatalogoDeMonedas, MonedasDelBanguat } from '../puertos/monedas.js';
import type { RelojDeCarga } from './cargar-tipos-de-cambio.js';

interface Dependencias {
  fuente: FuenteDeTiposDeCambio;
  delBanguat: MonedasDelBanguat;
  catalogo: CatalogoDeMonedas;
  cargas: CargasDeTipos;
  reloj: RelojDeCarga;
  excluidos: ReadonlySet<number>;
}

/** Los valores de los últimos 7 días de un código del Banguat, tal como llegaron (nada se guarda). */
export interface MuestraDelBanguat {
  codigo: number;
  descripcion: string;
  moneda: string | null;
  desde: string;
  hasta: string;
  resultado: ResultadoDeLaConsulta;
  /** Quetzales por unidad, de la fecha más vieja a la más nueva. */
  valores: { fecha: string; referencia: string }[];
  rechazadas: { fecha: string; motivo: string }[];
  /** Por qué no hay valores, si fue un fallo del servicio. */
  mensaje: string | null;
}

/** Quién pide la muestra y para qué moneda (la que se está editando, si ya existe). */
export interface PedidoDeMuestra {
  usuarioId: string;
  moneda?: string | undefined;
}

const DIAS_DE_LA_MUESTRA = 6;
const MONEDA_SIN_DUENA = 'XXX';

function resultadoDe(valores: number, rechazadas: number): ResultadoDeLaConsulta {
  if (valores > 0) return 'exito';
  return rechazadas > 0 ? 'valor_ambiguo' : 'sin_datos';
}

/**
 * Soporte ve qué publica el Banguat bajo un código antes de unírselo a una moneda («1.1257» es el euro, en dólares por
 * euro; «157.76» el yen, en yenes por dólar). No guarda tipos; la consulta queda en la bitácora con la vuelta `muestra`. Un fallo del Banguat no
 * lanza: vuelve como `resultado: 'error'` con su mensaje.
 */
export class VerMuestraDelBanguat {
  constructor(private readonly dependencias: Dependencias) {}

  /** @throws CodigoDelBanguatNoOfrecido si el código no está en la lista, no está disponible o está excluido. */
  async ejecutar(codigo: number, pedido: PedidoDeMuestra): Promise<MuestraDelBanguat> {
    const { delBanguat, excluidos, reloj } = this.dependencias;
    const ofrecida = await delBanguat.buscar(codigo);
    if (!ofrecida?.disponible || excluidos.has(codigo)) throw new CodigoDelBanguatNoOfrecido(codigo);
    const hasta = fechaLocalEn(reloj.ahora(), await reloj.zona());
    const vacia: MuestraDelBanguat = {
      codigo,
      descripcion: ofrecida.descripcion,
      moneda: await this.monedaDe(codigo, pedido.moneda),
      desde: sumarDiasAFecha(hasta, -DIAS_DE_LA_MUESTRA),
      hasta,
      resultado: 'sin_datos',
      valores: [],
      rechazadas: [],
      mensaje: null,
    };
    const iniciadaEn = reloj.ahora();
    const hecha = await this.pedir(vacia);
    await this.dejarConstancia(hecha, iniciadaEn, pedido.usuarioId);
    return hecha;
  }

  private async monedaDe(codigo: number, referencia?: string): Promise<string | null> {
    const { catalogo } = this.dependencias;
    if (referencia && (await catalogo.buscar(referencia))) return referencia;
    return catalogo.duenaDelCodigo(codigo);
  }

  private async pedir(muestra: MuestraDelBanguat): Promise<MuestraDelBanguat> {
    const moneda = muestra.moneda ?? MONEDA_SIN_DUENA;
    try {
      const recibido = await this.dependencias.fuente.tiposDeLaMoneda({
        moneda,
        codigoBanguat: muestra.codigo,
        hoy: muestra.hasta,
        desde: muestra.desde,
        hasta: muestra.hasta,
      });
      const valores = recibido.publicaciones
        .filter((p) => p.moneda === moneda)
        .map((p) => ({ fecha: p.fecha, referencia: p.referencia }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      const rechazadas = recibido.rechazadas.map((r) => ({ fecha: r.fecha, motivo: r.motivo }));
      return { ...muestra, valores, rechazadas, resultado: resultadoDe(valores.length, rechazadas.length) };
    } catch (error) {
      if (!(error instanceof FuenteNoDisponible || error instanceof RespuestaInvalida)) throw error;
      return { ...muestra, resultado: 'error', mensaje: error.message };
    }
  }

  private async dejarConstancia(muestra: MuestraDelBanguat, iniciadaEn: Date, usuarioId: string): Promise<void> {
    await this.dependencias.cargas.guardar(
      {
        iniciadaEn,
        terminadaEn: this.dependencias.reloj.ahora(),
        operacion: 'TipoCambioRangoMoneda',
        vuelta: 'muestra',
        moneda: muestra.moneda,
        codigoBanguat: muestra.codigo,
        desde: muestra.desde,
        hasta: muestra.hasta,
        resultado: muestra.resultado,
        filasRechazadas: muestra.rechazadas.length,
        detalle: muestra.mensaje?.slice(0, 500) ?? null,
        disparadaPor: usuarioId,
      },
      [],
    );
  }
}
