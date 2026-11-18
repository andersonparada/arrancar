import type {
  FuenteDeTiposDeCambio,
  OpcionesDeConsulta,
  OpcionesDeRango,
} from '../aplicacion/puertos/fuente-de-tipos-de-cambio.js';
import type { PublicacionDeTipoDeCambio, ResultadoDeConsulta } from '../dominio/publicacion.js';

/**
 * Doble de prueba de la fuente: sirve las publicaciones que se le cargan (el día, las de `hoy`;
 * el rango, las de sus fechas) y puede simular fallos. Recuerda cuántas consultas recibió.
 */
export class FuenteDeTiposDeCambioEnMemoria implements FuenteDeTiposDeCambio {
  readonly publicaciones: PublicacionDeTipoDeCambio[] = [];
  /** Errores que se lanzan, uno por consulta, antes de responder con normalidad. */
  readonly fallosPendientes: Error[] = [];
  consultas = 0;

  async tipoDelDia(opciones: OpcionesDeConsulta): Promise<ResultadoDeConsulta> {
    this.simular();
    return this.resultado((p) => p.fecha === opciones.hoy);
  }

  async tiposDelRango(opciones: OpcionesDeRango): Promise<ResultadoDeConsulta> {
    this.simular();
    return this.resultado((p) => p.fecha >= opciones.desde && p.fecha <= opciones.hasta);
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
