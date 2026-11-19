import { CORREOS_POR_LOTE, type RegistroDeErrores } from './casos-uso/enviar-lote-de-correos.js';
import type { Despertador } from './puertos/despertador.js';

/** Cada cuánto revisa la bandeja aunque nadie lo despierte (los reintentos vencen solos). */
export const INTERVALO_DE_LA_BANDEJA_EN_MS = 30_000;
/** Lo máximo que se espera al lote en curso al apagar el servidor. */
export const ESPERA_AL_APAGAR_EN_MS = 20_000;

interface Lote {
  ejecutar(): Promise<number>;
}

interface Dependencias {
  lote: Lote;
  registro: RegistroDeErrores;
  /** Cierra el transporte al apagar. */
  alCerrar: () => Promise<void>;
  intervaloEnMs?: number;
  esperaAlApagarEnMs?: number;
}

/**
 * El trabajador de la bandeja de correos, dentro del mismo proceso que la API: revisa cada 30 segundos y cada vez que
 * un caso de uso encola algo (`despertar`), y nunca corre dos lotes a la vez. Con SIGTERM (`detener`) deja de tomar
 * correos, espera el lote en curso (máximo 20 segundos) y cierra el transporte; lo que quedó `enviando` se retoma al
 * vencer su arriendo.
 */
export class ProcesarBandeja implements Despertador {
  private temporizador: NodeJS.Timeout | null = null;
  private corriendo: Promise<void> | null = null;
  private otraVuelta = false;
  private detenido = true;

  constructor(private readonly dependencias: Dependencias) {}

  iniciar(): void {
    this.detenido = false;
    this.programar(0);
  }

  /** Hay correo nuevo: lo atiende ya (si ya hay un lote en curso, hace otra vuelta al terminar). */
  despertar(): void {
    if (this.detenido) return;
    if (this.corriendo) this.otraVuelta = true;
    else this.programar(0);
  }

  async detener(): Promise<void> {
    this.detenido = true;
    this.limpiar();
    const espera = this.dependencias.esperaAlApagarEnMs ?? ESPERA_AL_APAGAR_EN_MS;
    if (this.corriendo)
      await Promise.race([this.corriendo, new Promise((resolver) => setTimeout(resolver, espera).unref())]);
    await this.dependencias.alCerrar();
  }

  private programar(milisegundos: number): void {
    this.limpiar();
    this.temporizador = setTimeout(() => void this.vuelta(), milisegundos);
    this.temporizador.unref();
  }

  private limpiar(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
  }

  private async vuelta(): Promise<void> {
    this.corriendo = this.tomarLotes();
    await this.corriendo;
    this.corriendo = null;
    if (this.detenido) return;
    this.programar(this.otraVuelta ? 0 : (this.dependencias.intervaloEnMs ?? INTERVALO_DE_LA_BANDEJA_EN_MS));
    this.otraVuelta = false;
  }

  /** Sigue mientras los lotes salgan llenos (puede haber más) y no se haya apagado. */
  private async tomarLotes(): Promise<void> {
    try {
      let tomados = CORREOS_POR_LOTE;
      while (tomados === CORREOS_POR_LOTE && !this.detenido) tomados = await this.dependencias.lote.ejecutar();
    } catch (error) {
      this.dependencias.registro.error('Falló un lote de la bandeja de correos', error);
    }
  }
}
