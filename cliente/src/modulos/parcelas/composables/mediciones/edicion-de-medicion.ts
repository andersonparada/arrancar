import { numeroONulo, textoDeEdicion, textoONulo } from '@/modulos/core/utilidades/edicion';
import type { DatosDeMedicion } from '../../servicios/parcelas.api';
import type { Medicion } from '../../servicios/mediciones.api';
import type { AjustesDeSuperficie } from '../superficie/unidades-de-superficie';

export const OPCIONES_DE_FUENTE = {
  escritura: 'Escritura',
  plano_topografico: 'Plano topográfico',
  gps: 'GPS',
  estimacion: 'Estimación',
  otra: 'Otra',
};

/** Lo que muestra cada campo mientras se escribe una medición: la cifra tal como el operador la lee de su papel. */
export interface EdicionDeMedicion {
  abierta: boolean;
  vigenteDesde: string;
  fuente: DatosDeMedicion['fuente'];
  cifra: string | number;
  unidad: DatosDeMedicion['unidadOriginal'];
  varasPorLadoDeCuerda: string | number;
  cifraUtil: string | number;
  documento: string;
}

/** La fecha de hoy del navegador, `AAAA-MM-DD`, sin pasar por UTC (no corre el día por la tarde). */
export function hoyEnIso(ahora: Date = new Date()): string {
  const dosDigitos = (numero: number) => String(numero).padStart(2, '0');
  return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
}

/** Una medición nueva, desde hoy, en la unidad que la empresa usa para ver sus superficies. */
export function medicionNueva(ajustes: AjustesDeSuperficie, abierta = true): EdicionDeMedicion {
  return {
    abierta,
    vigenteDesde: hoyEnIso(),
    fuente: 'escritura',
    cifra: '',
    unidad: ajustes.unidadParaMostrar,
    varasPorLadoDeCuerda: ajustes.varasPorLadoDeCuerda,
    cifraUtil: '',
    documento: '',
  };
}

/** Lo que se manda al servidor: lo vacío como `null`; las cifras van como texto, nunca como número. */
export const datosDeMedicion = (edicion: EdicionDeMedicion): DatosDeMedicion => ({
  vigenteDesde: edicion.vigenteDesde,
  fuente: edicion.fuente,
  cantidadOriginal: textoDeEdicion(edicion.cifra).trim(),
  unidadOriginal: edicion.unidad,
  varasPorLadoDeCuerda: edicion.unidad === 'cuerda' ? numeroONulo(edicion.varasPorLadoDeCuerda) : null,
  cantidadUtil: textoONulo(edicion.cifraUtil),
  documento: textoONulo(edicion.documento),
});

/** Cómo se llama en el formulario cada campo de la medición que el servidor señala con otro nombre. */
const CAMPO_DE_LA_MEDICION: Record<string, string> = {
  cantidadOriginal: 'cifra',
  cantidadUtil: 'cifraUtil',
  unidadOriginal: 'unidad',
};

/** Los errores del servidor por campo de la medición, con el nombre que llevan en los campos del formulario. */
export function erroresDeMedicion(errores: Record<string, string>): Record<string, string> {
  const resultado: Record<string, string> = {};
  for (const [campo, mensaje] of Object.entries(errores)) {
    const nombre = campo.replace(/^medicion\./, '');
    resultado[CAMPO_DE_LA_MEDICION[nombre] ?? nombre] = mensaje;
  }
  return resultado;
}

/** La medición que rige a una fecha: la vigente más reciente que ya empezó; las anuladas no cuentan. */
export function medicionQueRige(mediciones: Medicion[], fecha: string): Medicion | null {
  const candidatas = mediciones.filter((medicion) => medicion.estado === 'vigente' && medicion.vigenteDesde <= fecha);
  return candidatas.sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde))[0] ?? null;
}

/** Lo que se le pregunta al operador antes de anular una medición. */
export const mensajeDeAnulacion = (fecha: string): string =>
  `Se anulará la medición vigente desde ${fecha}. No se borra: queda en el historial con su motivo y la parcela vuelve a la medición anterior.`;
