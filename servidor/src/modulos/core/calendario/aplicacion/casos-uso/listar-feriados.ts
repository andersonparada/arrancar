import { feriadosCalculados } from '../../dominio/feriados-calculados.js';
import type { Feriado } from '../../dominio/feriado.js';
import type { Asuetos } from '../puertos/asuetos.js';

/** Un feriado del año; `id` solo viene en los asuetos guardados (los calculados no se pueden quitar). */
export interface FeriadoDto extends Feriado {
  id: string | null;
}

interface Dependencias {
  asuetos: Asuetos;
}

/** Los feriados de un año: los calculados (fijos y Semana Santa) y los asuetos guardados, por fecha. */
export class ListarFeriados {
  constructor(private readonly dependencias: Dependencias) {}

  async ejecutar(anio: number): Promise<FeriadoDto[]> {
    const guardados = await this.dependencias.asuetos.delAnio(anio);
    const calculados = feriadosCalculados(anio).map((feriado): FeriadoDto => ({ id: null, ...feriado }));
    const asuetos = guardados.map((asueto): FeriadoDto => ({ ...asueto, medioDia: false }));
    return [...calculados, ...asuetos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
}
