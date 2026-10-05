import type { Feriado } from './feriado.js';
import { fechaIso, sumarDias } from './fecha-iso.js';
import { domingoDePascua } from './pascua.js';

interface FeriadoFijo {
  mes: number;
  dia: number;
  nombre: string;
  medioDia?: boolean;
}

/** Código de Trabajo, art. 127 (sin el 15 de agosto, que solo rige en el municipio de Guatemala). */
const FIJOS: readonly FeriadoFijo[] = [
  { mes: 1, dia: 1, nombre: 'Año Nuevo' },
  { mes: 5, dia: 1, nombre: 'Día del Trabajo' },
  { mes: 6, dia: 30, nombre: 'Día del Ejército' },
  { mes: 9, dia: 15, nombre: 'Día de la Independencia' },
  { mes: 10, dia: 20, nombre: 'Día de la Revolución' },
  { mes: 11, dia: 1, nombre: 'Día de Todos los Santos' },
  { mes: 12, dia: 24, nombre: 'Nochebuena (desde el mediodía)', medioDia: true },
  { mes: 12, dia: 25, nombre: 'Navidad' },
  { mes: 12, dia: 31, nombre: 'Fin de año (desde el mediodía)', medioDia: true },
];

const SEMANA_SANTA: readonly { dias: number; nombre: string }[] = [
  { dias: -3, nombre: 'Jueves Santo' },
  { dias: -2, nombre: 'Viernes Santo' },
  { dias: -1, nombre: 'Sábado Santo' },
];

/** Los feriados fijos y los de Semana Santa de un año, por fecha. No se guardan: se calculan. */
export function feriadosCalculados(anio: number): Feriado[] {
  const fijos = FIJOS.map(({ mes, dia, nombre, medioDia }): Feriado => ({
    fecha: fechaIso(anio, mes, dia),
    nombre,
    origen: 'fijo',
    medioDia: medioDia ?? false,
  }));
  const pascua = domingoDePascua(anio);
  const santos = SEMANA_SANTA.map(({ dias, nombre }): Feriado => ({
    fecha: sumarDias(pascua, dias),
    nombre,
    origen: 'semana_santa',
    medioDia: false,
  }));
  return [...fijos, ...santos].sort((a, b) => a.fecha.localeCompare(b.fecha));
}
