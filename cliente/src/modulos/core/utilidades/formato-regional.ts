export type FormatoDeFecha = 'dd/mm/aaaa' | 'aaaa-mm-dd' | 'mm/dd/aaaa';

/** Cómo prefiere ver fechas y números la empresa (ver `core.regional.*` en Configuración). */
export interface AjustesRegionales {
  zonaHoraria: string;
  formatoFecha: FormatoDeFecha;
  decimalesMontos: number;
  decimalesCantidades: number;
}

export const AJUSTES_REGIONALES_PREDETERMINADOS: AjustesRegionales = {
  zonaHoraria: 'America/Guatemala',
  formatoFecha: 'dd/mm/aaaa',
  decimalesMontos: 2,
  decimalesCantidades: 2,
};

const SIN_VALOR = '—';
const IDIOMA = 'es-GT';

type Instante = string | Date | null | undefined;
type Numero = string | number | null | undefined;

/** Da formato a fechas, montos y cantidades según los ajustes de la empresa. */
export class FormatoRegional {
  constructor(private readonly ajustes: AjustesRegionales) {}

  fecha(valor: Instante): string {
    if (!valor) return SIN_VALOR;
    const { dia, mes, anio } = this.partesDeLaFecha(new Date(valor));
    const porFormato: Record<FormatoDeFecha, string> = {
      'dd/mm/aaaa': `${dia}/${mes}/${anio}`,
      'aaaa-mm-dd': `${anio}-${mes}-${dia}`,
      'mm/dd/aaaa': `${mes}/${dia}/${anio}`,
    };
    return porFormato[this.ajustes.formatoFecha];
  }

  fechaHora(valor: Instante): string {
    if (!valor) return SIN_VALOR;
    const hora = new Intl.DateTimeFormat(IDIOMA, { timeStyle: 'short', timeZone: this.ajustes.zonaHoraria });
    return `${this.fecha(valor)} ${hora.format(new Date(valor))}`;
  }

  /** Recibe texto para no perder precisión en los decimales que manda el servidor. */
  monto(valor: Numero, moneda = 'GTQ'): string {
    if (!hayNumero(valor)) return SIN_VALOR;
    const decimales = this.ajustes.decimalesMontos;
    return new Intl.NumberFormat(IDIOMA, {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(Number(valor));
  }

  cantidad(valor: Numero, unidad?: string): string {
    if (!hayNumero(valor)) return SIN_VALOR;
    const decimales = this.ajustes.decimalesCantidades;
    const numero = new Intl.NumberFormat(IDIOMA, {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(Number(valor));
    return unidad ? `${numero} ${unidad}` : numero;
  }

  /** El día del calendario en la zona horaria de la empresa, no en la del navegador. */
  private partesDeLaFecha(fecha: Date): { dia: string; mes: string; anio: string } {
    const partes = new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: this.ajustes.zonaHoraria,
    }).formatToParts(fecha);
    const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? '';
    return { dia: parte('day'), mes: parte('month'), anio: parte('year') };
  }
}

function hayNumero(valor: Numero): valor is string | number {
  return valor !== null && valor !== undefined && valor !== '' && !Number.isNaN(Number(valor));
}
