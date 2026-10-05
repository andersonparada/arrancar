/**
 * Puerto del calendario laboral: dice si un día cuenta como hábil para los plazos fiscales. Hoy lo cumple el
 * calendario de lunes a viernes; cuando exista la tabla de feriados, otra implementación la consultará.
 */
export interface CalendarioLaboral {
  /** `fecha` es `AAAA-MM-DD`. */
  esHabil(fecha: string): boolean;
}

/** De lunes a viernes, sin descontar feriados (el plazo real puede ser más largo). */
export class CalendarioDeLunesAViernes implements CalendarioLaboral {
  esHabil(fecha: string): boolean {
    const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
    return dia !== 0 && dia !== 6;
  }
}
