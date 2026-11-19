import type { DepuradorDeCorreos, ResultadoDeDepuracionDeCorreos } from '../puertos/cola-de-envio.js';
import type { ParametrosDeCorreo } from '../puertos/parametros-de-correo.js';

interface Dependencias {
  depurador: DepuradorDeCorreos;
  parametros: ParametrosDeCorreo;
}

/**
 * Depuración diaria de la bandeja (C13): el cuerpo y el adjunto se borran a los 30 días (configurable, mínimo 7) y
 * las filas de lo ya terminado a los 60 meses, como la auditoría. No es un registro de negocio: no va a la auditoría.
 */
export class DepurarCorreos {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(): Promise<ResultadoDeDepuracionDeCorreos> {
    const { diasDelContenido, mesesDeLosMetadatos } = await this.dependencias.parametros.conservacion();
    return this.dependencias.depurador.depurar(diasDelContenido, mesesDeLosMetadatos);
  }
}
