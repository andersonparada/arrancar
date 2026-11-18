import { FuenteNoDisponible } from '../dominio/errores.js';
import type { MonedaDelBanguat, ResultadoDeConsulta } from '../dominio/publicacion.js';
import type {
  FuenteDeTiposDeCambio,
  OpcionesDeConsulta,
  OpcionesDeMoneda,
  OpcionesDeRango,
} from './puertos/fuente-de-tipos-de-cambio.js';

/** Esperas entre intentos de una misma vuelta (ms); la vuelta siguiente la decide el horario, no esta clase. */
export const ESPERAS_POR_OMISION_MS: readonly number[] = [2_000, 5_000];

export interface OpcionesDeReintentos {
  /** Cuánto esperar antes de cada reintento; su largo es el número de reintentos. */
  readonly esperasMs?: readonly number[];
  /** Cómo esperar; las pruebas la reemplazan para no demorar. */
  readonly esperar?: (milisegundos: number) => Promise<void>;
}

const esperarDeVerdad = (milisegundos: number): Promise<void> =>
  new Promise((resolver) => setTimeout(resolver, milisegundos));

/** Decorador: repite la consulta con espera cuando la fuente no está disponible. Una respuesta inválida no se repite. */
export class FuenteConReintentos implements FuenteDeTiposDeCambio {
  private readonly esperasMs: readonly number[];
  private readonly esperar: (milisegundos: number) => Promise<void>;

  constructor(
    private readonly fuente: FuenteDeTiposDeCambio,
    opciones: OpcionesDeReintentos = {},
  ) {
    this.esperasMs = opciones.esperasMs ?? ESPERAS_POR_OMISION_MS;
    this.esperar = opciones.esperar ?? esperarDeVerdad;
  }

  tipoDelDia(opciones: OpcionesDeConsulta): Promise<ResultadoDeConsulta> {
    return this.conReintentos(() => this.fuente.tipoDelDia(opciones));
  }

  tiposDelRango(opciones: OpcionesDeRango): Promise<ResultadoDeConsulta> {
    return this.conReintentos(() => this.fuente.tiposDelRango(opciones));
  }

  tiposDeLaMoneda(opciones: OpcionesDeMoneda): Promise<ResultadoDeConsulta> {
    return this.conReintentos(() => this.fuente.tiposDeLaMoneda(opciones));
  }

  monedasDisponibles(): Promise<readonly MonedaDelBanguat[]> {
    return this.conReintentos(() => this.fuente.monedasDisponibles());
  }

  private async conReintentos<T>(consulta: () => Promise<T>): Promise<T> {
    for (const espera of this.esperasMs) {
      try {
        return await consulta();
      } catch (error) {
        if (!(error instanceof FuenteNoDisponible)) throw error;
        await this.esperar(espera);
      }
    }
    return consulta();
  }
}
