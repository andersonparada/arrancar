/**
 * Puerto del calendario laboral: dice si un día cuenta como hábil para los plazos fiscales. Es síncrono para que
 * el dominio siga siendo puro; la `FuenteDeCalendario` lo arma antes de calcular.
 */
export interface CalendarioLaboral {
  /** `fecha` es `AAAA-MM-DD`. */
  esHabil(fecha: string): boolean;
}

/** Da un calendario laboral que ya sabe los días no hábiles (feriados y asuetos) de los años pedidos. */
export interface FuenteDeCalendario {
  paraAnios(anios: readonly number[]): Promise<CalendarioLaboral>;
}

/** De lunes a viernes, sin descontar feriados (el plazo real puede ser más largo). Sirve para pruebas. */
export class CalendarioDeLunesAViernes implements CalendarioLaboral {
  esHabil(fecha: string): boolean {
    const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
    return dia !== 0 && dia !== 6;
  }
}

/** Fuente que siempre da el calendario de lunes a viernes. Sirve para pruebas. */
export class FuenteDeLunesAViernes implements FuenteDeCalendario {
  async paraAnios(): Promise<CalendarioLaboral> {
    return new CalendarioDeLunesAViernes();
  }
}
