import type {
  CerrojoDeCorrida,
  ExploradorDeArchivos,
  RegistroDeRutas,
  RegistroDeTexto,
} from '../puertos/depuracion-de-archivos.js';

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
  cerrojo: CerrojoDeCorrida;
  registroDeTexto: RegistroDeTexto;
  /** Se inyecta para fijar la hora en las pruebas. */
  ahora?: () => Date;
}

export interface ResultadoDeDepuracion {
  revisados: number;
  borrados: number;
  /** `true` si se llegó al tope de borrados y quedan archivos para el día siguiente. */
  topeAlcanzado: boolean;
  /** `true` si una tanda completa volvió sin ninguna ruta registrada: parece un fallo, no huérfanos. */
  detenidaPorSospecha: boolean;
}

/**
 * Borra los archivos del disco que no tienen fila en `core.archivos` (los que deja un proceso que murió a
 * medias) y que llevan más de 24 horas sin cambiar. Lo inverso, una fila sin archivo, no se toca. No va a
 * la auditoría: no es un registro de negocio de ninguna empresa. Si falla la consulta, la corrida se detiene
 * sin borrar nada de esa tanda; si una tanda completa de 500 no trae ninguna registrada, también (la
 * consulta podría estar viendo una base equivocada).
 */
export class DepurarArchivosHuerfanos {
  constructor(private readonly dependencias: Dependencias) {}

  private detenida(resultado: ResultadoDeDepuracion): boolean {
    return resultado.topeAlcanzado || resultado.detenidaPorSospecha;
  }

  /** @returns el resultado, o `null` si otra instancia ya estaba depurando. */
  async ejecutar(): Promise<ResultadoDeDepuracion | null> {
    const resultado = await this.dependencias.cerrojo.ejecutarSiLibre(() => this.depurar());
    if (resultado === null)
      this.dependencias.registroDeTexto.info('Depuración de archivos huérfanos: otra instancia está corriendo.');
    return resultado;
  }

  private async depurar(): Promise<ResultadoDeDepuracion> {
    const ahora = (this.dependencias.ahora ?? (() => new Date()))();
    const antesDe = new Date(ahora.getTime() - LIMITES_DE_LA_DEPURACION.edadMinimaEnMs);
    const resultado: ResultadoDeDepuracion = {
      revisados: 0,
      borrados: 0,
      topeAlcanzado: false,
      detenidaPorSospecha: false,
    };
    let tanda: string[] = [];
    for await (const ruta of this.dependencias.explorador.listarModificadosAntesDe(antesDe)) {
      tanda.push(ruta);
      if (tanda.length < LIMITES_DE_LA_DEPURACION.rutasPorConsulta) continue;
      await this.depurarTanda(tanda, resultado);
      tanda = [];
      if (this.detenida(resultado)) break;
    }
    if (tanda.length > 0 && !this.detenida(resultado)) await this.depurarTanda(tanda, resultado);
    this.informar(resultado);
    return resultado;
  }

  private async depurarTanda(tanda: string[], resultado: ResultadoDeDepuracion): Promise<void> {
    const registradas = await this.dependencias.registro.registradas(tanda);
    resultado.revisados += tanda.length;
    if (tanda.length === LIMITES_DE_LA_DEPURACION.rutasPorConsulta && registradas.size === 0) {
      resultado.detenidaPorSospecha = true;
      return;
    }
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

  private informar(resultado: ResultadoDeDepuracion): void {
    const { registroDeTexto } = this.dependencias;
    registroDeTexto.info(
      `Depuración de archivos huérfanos: ${resultado.revisados} revisados, ${resultado.borrados} borrados.`,
    );
    if (resultado.topeAlcanzado)
      registroDeTexto.advertencia(
        `Se alcanzó el tope de ${LIMITES_DE_LA_DEPURACION.borradosPorCorrida} borrados; el resto sigue mañana.`,
      );
    if (resultado.detenidaPorSospecha)
      registroDeTexto.advertencia(
        'Una tanda completa no tuvo ninguna ruta registrada: se detuvo sin borrar esa tanda. Revise la base y la carpeta de archivos.',
      );
  }
}
