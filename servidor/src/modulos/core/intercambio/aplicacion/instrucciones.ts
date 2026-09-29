import type { Columna, TipoDeColumna } from './columnas.js';

const COMO_SE_ESCRIBE: Record<TipoDeColumna, (columna: Columna) => string> = {
  texto: () => 'Texto.',
  entero: () => 'Número entero, sin decimales.',
  decimal: () => 'Número; los decimales con punto (1250.50).',
  fecha: () => 'Fecha, como 15/03/2024.',
  siNo: () => 'Sí o No.',
  lista: (columna) => `Una de estas: ${columna.tipo === 'lista' ? Object.values(columna.opciones).join(', ') : ''}.`,
  referencia: (columna) =>
    columna.tipo === 'referencia' && columna.tambienPorCodigo
      ? 'El nombre o el código, tal como está registrado en la aplicación.'
      : 'El nombre, tal como está registrado en la aplicación.',
};

/** La hoja de instrucciones de la plantilla: una fila por columna. */
export const instruccionesDe = (columnas: Columna[]): string[][] => [
  ['Columna', 'Obligatoria', 'Cómo se escribe'],
  ...columnas.map((columna) => [
    columna.titulo,
    columna.requerido ? 'Sí' : 'No',
    COMO_SE_ESCRIBE[columna.tipo](columna),
  ]),
];
