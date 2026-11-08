import { formatearFecha } from './formato';

/** Lo que el navegador sabe de un campo (`ValidityState`, pero solo lo que se usa, para poder probarlo). */
export type EstadoNativo = Pick<ValidityState, 'valueMissing' | 'rangeOverflow' | 'rangeUnderflow' | 'badInput'>;

interface Campo {
  validez: EstadoNativo;
  tipo?: string;
  maximo?: string;
}

function mensajeDeFecha({ validez, maximo }: Campo): string {
  if (validez.valueMissing) return 'Elija o escriba la fecha.';
  if (validez.badInput) return 'Escriba una fecha válida.';
  if (validez.rangeOverflow && maximo) return `La fecha no puede ser posterior al ${formatearFecha(maximo)}.`;
  return '';
}

/**
 * El texto en español para la burbuja del navegador, que sale en el idioma del navegador («Please fill out this
 * field.»). Devuelve `''` si no hay un texto propio para ese caso (el navegador usa el suyo).
 */
export function mensajeDeValidacionNativa(campo: Campo): string {
  const propio = campo.tipo === 'date' ? mensajeDeFecha(campo) : '';
  if (propio) return propio;
  const { validez } = campo;
  if (validez.valueMissing) return 'Complete este campo.';
  if (validez.rangeOverflow) return 'El valor es demasiado grande.';
  return validez.rangeUnderflow ? 'El valor es demasiado pequeño.' : '';
}
