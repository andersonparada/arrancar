import type { ExploradorDeArchivos, RegistroDeRutas, RegistroDeTexto } from '../puertos/depuracion-de-archivos.js';

/** Constantes de seguridad, no configurables. */
export const LIMITES_DE_LA_DEPURACION = {
  /** Un archivo más reciente puede ser una subida en curso: nunca es candidato. */
  edadMinimaEnMs: 24 * 60 * 60 * 1000,
  rutasPorConsulta: 500,
  borradosPorCorrida: 1000,
} as const;

interface Dependencias {
  explorador: ExploradorDeArchivos;
  registro: RegistroDeRutas;
  registroDeTexto: RegistroDeTexto;
  /** Se inyecta para fijar la hora en las pruebas. */
  ahora?: () => Date;
}

export interface ResultadoDeDepuracion {
  revisados: number;
  borrados: number;
  /** `true` si se llegó al tope de borrados y quedan archivos para el día siguiente. */
  topeAlcanzado: boolean;
}

/**
 * Borra los archivos del disco que no tienen fila en `core.archivos` (los que deja un proceso que murió a
 * medias) y que llevan más de 24 horas sin cambiar. Lo inverso, una fila sin archivo, no se toca. No va a
 * la auditoría: no es un registro de negocio de ninguna empresa. Si falla la consulta, la corrida se detiene
 * sin borrar nada de esa tanda.
 */
export class DepurarArchivosHuerfanos {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(): Promise<ResultadoDeDepuracion> {
    const ahora = (this.dependencias.ahora ?? (() => new Date()))();
    const antesDe = new Date(ahora.getTime() - LIMITES_DE_LA_DEPURACION.edadMinimaEnMs);
    const resultado: ResultadoDeDepuracion = { revisados: 0, borrados: 0, topeAlcanzado: false };
    let tanda: string[] = [];
    for await (const ruta of this.dependencias.explorador.listarModificadosAntesDe(antesDe)) {
      tanda.push(ruta);
      if (tanda.length < LIMITES_DE_LA_DEPURACION.rutasPorConsulta) continue;
      await this.depurarTanda(tanda, resultado);
      tanda = [];
      if (resultado.topeAlcanzado) break;
    }
    if (tanda.length > 0 && !resultado.topeAlcanzado) await this.depurarTanda(tanda, resultado);
    this.informar(resultado);
    return resultado;
  }

  private async depurarTanda(tanda: string[], resultado: ResultadoDeDepuracion): Promise<void> {
    const registradas = await this.dependencias.registro.registradas(tanda);
    resultado.revisados += tanda.length;
    for (const ruta of tanda.filter((candidata) => !registradas.has(candidata))) {
      if (resultado.borrados >= LIMITES_DE_LA_DEPURACION.borradosPorCorrida) {
        resultado.topeAlcanzado = true;
        return;
      }
      if (await this.borrar(ruta)) resultado.borrados += 1;
    }
  }

  private async borrar(ruta: string): Promise<boolean> {
    try {
      await this.dependencias.explorador.borrar(ruta);
      this.dependencias.registroDeTexto.info(`Archivo huérfano borrado: ${ruta}`);
      return true;
    } catch {
      this.dependencias.registroDeTexto.advertencia(`No se pudo borrar el archivo huérfano: ${ruta}`);
      return false;
    }
  }

  private informar({ revisados, borrados, topeAlcanzado }: ResultadoDeDepuracion): void {
    const { registroDeTexto } = this.dependencias;
    registroDeTexto.info(`Depuración de archivos huérfanos: ${revisados} revisados, ${borrados} borrados.`);
    if (topeAlcanzado)
      registroDeTexto.advertencia(
        `Se alcanzó el tope de ${LIMITES_DE_LA_DEPURACION.borradosPorCorrida} borrados; el resto sigue mañana.`,
      );
  }
}
