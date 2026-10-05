import { calendarioLaboral } from '../../core/calendario/contexto.js';
import { sumarDias } from '../../core/calendario/dominio/fecha-iso.js';
import type { CalendarioLaboral, FuenteDeCalendario } from '../dominio/calendario-laboral.js';

/** Un calendario que ya sabe qué días son hábiles: solo consulta un conjunto en memoria. */
class CalendarioPrecargado implements CalendarioLaboral {
  constructor(
    private readonly anios: ReadonlySet<number>,
    private readonly noHabiles: ReadonlySet<string>,
  ) {}

  esHabil(fecha: string): boolean {
    const anio = Number(fecha.slice(0, 4));
    if (!this.anios.has(anio)) throw new Error(`El calendario no se precargó para el año ${anio}.`);
    return !this.noHabiles.has(fecha);
  }
}

/** Los feriados y asuetos de Guatemala (calendario del core), leídos de antemano para que el dominio sea síncrono. */
export class CalendarioDeFeriados implements FuenteDeCalendario {
  constructor(private readonly dias: Pick<typeof calendarioLaboral, 'esHabil'> = calendarioLaboral) {}

  async paraAnios(anios: readonly number[]): Promise<CalendarioLaboral> {
    const noHabiles = new Set<string>();
    for (const anio of anios) {
      for (let fecha = `${anio}-01-01`; fecha.startsWith(`${anio}-`); fecha = sumarDias(fecha, 1)) {
        if (!(await this.dias.esHabil(fecha))) noHabiles.add(fecha);
      }
    }
    return new CalendarioPrecargado(new Set(anios), noHabiles);
  }
}
