import type {
  FuenteDeTiposDeCambio,
  OpcionesDeConsulta,
  OpcionesDeMoneda,
  OpcionesDeRango,
} from '../aplicacion/puertos/fuente-de-tipos-de-cambio.js';
import type { MonedaDelBanguat, PublicacionDeTipoDeCambio, ResultadoDeConsulta } from '../dominio/publicacion.js';

/**
 * Doble de prueba de la fuente: sirve las publicaciones que se le cargan (el día, las de `hoy` del dólar y
 * de las monedas pedidas; el rango del dólar y el de cada moneda, las de sus fechas) y la lista de monedas
 * que se le da. Puede simular fallos y recuerda cuántas consultas recibió.
 */
export class FuenteDeTiposDeCambioEnMemoria implements FuenteDeTiposDeCambio {
  readonly publicaciones: PublicacionDeTipoDeCambio[] = [];
  readonly monedasDelBanguat: MonedaDelBanguat[] = [];
  /** Errores que se lanzan, uno por consulta, antes de responder con normalidad. */
  readonly fallosPendientes: Error[] = [];
  consultas = 0;

  async tipoDelDia(opciones: OpcionesDeConsulta): Promise<ResultadoDeConsulta> {
    this.simular();
    const codigos = new Set([2, ...(opciones.monedas ?? []).map((m) => m.codigoBanguat)]);
    return this.resultado((p) => p.fecha === opciones.hoy && codigos.has(p.codigoBanguat));
  }

  async tiposDelRango(opciones: OpcionesDeRango): Promise<ResultadoDeConsulta> {
    return this.tiposDeLaMoneda({ ...opciones, moneda: 'USD', codigoBanguat: 2 });
  }

  async tiposDeLaMoneda(opciones: OpcionesDeMoneda): Promise<ResultadoDeConsulta> {
    this.simular();
    return this.resultado(
      (p) => p.codigoBanguat === opciones.codigoBanguat && p.fecha >= opciones.desde && p.fecha <= opciones.hasta,
    );
  }

  async monedasDisponibles(): Promise<readonly MonedaDelBanguat[]> {
    this.simular();
    return [...this.monedasDelBanguat];
  }

  private simular(): void {
    this.consultas += 1;
    const fallo = this.fallosPendientes.shift();
    if (fallo) throw fallo;
  }

  private resultado(coincide: (p: PublicacionDeTipoDeCambio) => boolean): ResultadoDeConsulta {
    return { publicaciones: this.publicaciones.filter(coincide), rechazadas: [] };
  }
}
