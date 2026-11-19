import { problemaDelArchivo } from '../conciliaciones/estado-de-cuenta';

/** Lo que se avisa al subir la evidencia: si ya había una, la reemplaza. */
export const avisoDeSubida = (reemplaza: boolean): string =>
  reemplaza ? 'Evidencia reemplazada.' : 'Evidencia adjuntada.';

/** Los mismos tipos y topes del estado de cuenta; devuelve cómo corregir el archivo, o `null` si está bien. */
export const problemaDeLaEvidencia = problemaDelArchivo;

/** Qué dice la tarjeta cuando no hay archivo: invita a subirlo si se puede, y si no, lo constata. */
export const textoSinEvidencia = (puedeEditar: boolean): string =>
  puedeEditar
    ? 'Aún no hay archivo. Es opcional, pero al cerrar la carga se le recordará que falta.'
    : 'No se adjuntó evidencia.';
