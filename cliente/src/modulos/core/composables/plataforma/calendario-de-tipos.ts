import type { TipoDeLaSerie } from '../../servicios/tipos-de-cambio.api';

/** Un mes como `AAAA-MM`. */
export type Mes = string;

/** Un día del mes con el tipo vigente que tiene, si lo tiene. */
export interface DiaDelCalendario {
  fecha: string;
  dia: number;
  /** 0 = lunes … 6 = domingo. */
  semana: number;
  tipo: TipoDeLaSerie | null;
  esHoy: boolean;
  /** Es posterior a hoy (el Banguat puede adelantar el de mañana, pero no más). */
  futuro: boolean;
  /** Sábado o domingo: las monedas que no son el dólar no se publican esos días. */
  finDeSemana: boolean;
}

export interface MesDelCalendario {
  /** Cuántas casillas vacías van antes del día 1 si la semana empieza en lunes. */
  espaciosAlInicio: number;
  dias: DiaDelCalendario[];
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const DIAS_DE_LA_SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export const encabezadosDeSemana = (): string[] => DIAS_DE_LA_SEMANA;

const dosDigitos = (numero: number) => String(numero).padStart(2, '0');

/** El mes al que pertenece una fecha `AAAA-MM-DD`. */
export const mesDe = (fecha: string): Mes => fecha.slice(0, 7);

/** Desplaza un mes (`-1` el anterior, `1` el siguiente). */
export function moverMes(mes: Mes, meses: number): Mes {
  const [anio = 0, numero = 1] = mes.split('-').map(Number);
  const indice = anio * 12 + (numero - 1) + meses;
  return `${Math.floor(indice / 12)}-${dosDigitos((indice % 12) + 1)}`;
}

/** «noviembre de 2026». */
export function nombreDelMes(mes: Mes): string {
  const [anio, numero = 1] = mes.split('-').map(Number);
  return `${MESES[numero - 1]} de ${anio}`;
}

/** El primer y el último día del mes, para pedir la serie. */
export function rangoDelMes(mes: Mes): { desde: string; hasta: string } {
  const [anio = 0, numero = 1] = mes.split('-').map(Number);
  const ultimo = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${dosDigitos(ultimo)}` };
}

/** Los días del mes con su tipo (la semana empieza en lunes). `hoy` es `AAAA-MM-DD` en la zona de la instalación. */
export function armarMes(mes: Mes, serie: TipoDeLaSerie[], hoy: string): MesDelCalendario {
  const { hasta } = rangoDelMes(mes);
  const porFecha = new Map(serie.map((tipo) => [tipo.fecha, tipo]));
  const total = Number(hasta.slice(8));
  const dias = Array.from({ length: total }, (_, i): DiaDelCalendario => {
    const fecha = `${mes}-${dosDigitos(i + 1)}`;
    const semana = diaDeLaSemana(fecha);
    return {
      fecha,
      dia: i + 1,
      semana,
      tipo: porFecha.get(fecha) ?? null,
      esHoy: fecha === hoy,
      futuro: fecha > hoy,
      finDeSemana: semana >= 5,
    };
  });
  return { espaciosAlInicio: diaDeLaSemana(`${mes}-01`), dias };
}

/** 0 = lunes … 6 = domingo. */
function diaDeLaSemana(fecha: string): number {
  return (new Date(`${fecha}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export interface ResumenDelMes {
  conTipo: number;
  manuales: number;
  /** Días hábiles ya pasados sin tipo (los fines de semana de las demás monedas no cuentan como falta). */
  sinTipoEntreSemana: number;
}

export function resumirMes(mes: MesDelCalendario): ResumenDelMes {
  const pasados = mes.dias.filter((dia) => !dia.futuro);
  return {
    conTipo: mes.dias.filter((dia) => dia.tipo).length,
    manuales: mes.dias.filter((dia) => dia.tipo?.origen === 'manual').length,
    sinTipoEntreSemana: pasados.filter((dia) => !dia.tipo && !dia.finDeSemana).length,
  };
}

/** «Banguat» o «Manual»: de dónde salió el valor de un día. */
export const origenDelTipo = (tipo: TipoDeLaSerie): string => (tipo.origen === 'banguat' ? 'Banguat' : 'Manual');
