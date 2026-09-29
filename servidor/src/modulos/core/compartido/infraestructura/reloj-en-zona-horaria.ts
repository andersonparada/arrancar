import type { ContextoEmpresa } from '../aplicacion/contexto-empresa.js';
import type { PoliticaDeZonaHoraria, Reloj } from '../aplicacion/reloj.js';
import { fechaLocalEn } from '../dominio/fecha-local.js';

/** El reloj real: toma la hora del sistema y la lleva a la zona horaria de la empresa. */
export class RelojEnZonaHoraria implements Reloj {
  constructor(
    private readonly politica: PoliticaDeZonaHoraria,
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  async hoy(contexto: ContextoEmpresa): Promise<string> {
    return fechaLocalEn(this.ahora(), await this.politica.zonaHoraria(contexto));
  }
}
