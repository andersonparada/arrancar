import { execFile } from 'node:child_process';
import { PdfNoSePudoRevisar } from '../../dominio/documento.js';

const MEGABYTE = 1024 * 1024;

/** Límites de cada invocación de qpdf: constantes de seguridad, salvo en las pruebas. */
export interface LimitesDeQpdf {
  memoriaEnBytes: number;
  cpuEnSegundos: number;
  tiempoEnMilisegundos: number;
  salidaMaximaEnBytes: number;
}

export const LIMITES_DE_QPDF: LimitesDeQpdf = {
  memoriaEnBytes: 512 * MEGABYTE,
  cpuEnSegundos: 20,
  tiempoEnMilisegundos: 15_000,
  salidaMaximaEnBytes: 64 * MEGABYTE,
};

/** Ruta fija: con `env` vacío el proceso hijo no busca en el `PATH`. */
const RUTA_DE_PRLIMIT = '/usr/bin/prlimit';

export interface ResultadoDeQpdf {
  /** Código de salida de qpdf (0 bien, 2 error, 3 avisos; en `--requires-password` significan otra cosa). */
  codigo: number;
  salida: string;
}

interface ErrorDeProceso extends Error {
  code?: number | string;
  killed?: boolean;
  signal?: string | null;
  stdout?: string;
}

/**
 * Corre qpdf como un proceso aparte, sin shell, con tope de memoria y de CPU (`prlimit`), tiempo límite,
 * entorno vacío y salida acotada. Un proceso que se pasa de los límites es un PDF que no se pudo revisar.
 */
export class EjecutorDeQpdf {
  constructor(
    private readonly rutaQpdf: string,
    private readonly limites: LimitesDeQpdf = LIMITES_DE_QPDF,
  ) {}

  /** @throws PdfNoSePudoRevisar si se pasó del tiempo, de la memoria o de la salida permitida. */
  ejecutar(argumentos: string[]): Promise<ResultadoDeQpdf> {
    const { memoriaEnBytes, cpuEnSegundos, tiempoEnMilisegundos, salidaMaximaEnBytes } = this.limites;
    const parametros = [`--as=${memoriaEnBytes}`, `--cpu=${cpuEnSegundos}`, '--', this.rutaQpdf, ...argumentos];
    return new Promise((resolver, rechazar) => {
      const opciones = { timeout: tiempoEnMilisegundos, maxBuffer: salidaMaximaEnBytes, env: {} };
      execFile(RUTA_DE_PRLIMIT, parametros, opciones, (error, salida) => {
        if (!error) return resolver({ codigo: 0, salida });
        const fallo = error as ErrorDeProceso;
        if (typeof fallo.code !== 'number' || fallo.killed || fallo.signal) return rechazar(traducir(fallo));
        resolver({ codigo: fallo.code, salida: fallo.stdout ?? '' });
      });
    });
  }
}

/** Sin código de salida numérico: se mató por tiempo, señal o salida excesiva; o no se pudo ni arrancar. */
function traducir(fallo: ErrorDeProceso): Error {
  const sinArrancar = fallo.code === 'ENOENT' || fallo.code === 'EACCES';
  return sinArrancar ? fallo : new PdfNoSePudoRevisar();
}
