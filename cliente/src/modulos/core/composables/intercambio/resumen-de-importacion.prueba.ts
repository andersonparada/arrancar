import { describe, expect, it } from 'vitest';
import { resumenDeRevision, ubicacionDelError } from './resumen-de-importacion';

describe('resumen de la revisión de un Excel', () => {
  it('sin problemas dice cuántas filas se importarán', () => {
    expect(resumenDeRevision({ filas: 1250, guardado: false, errores: [] })).toBe('1,250 filas listas para importar.');
    expect(resumenDeRevision({ filas: 1, guardado: false, errores: [] })).toBe('1 fila lista para importar.');
  });

  it('con problemas los cuenta por filas y aclara que no se guardó nada', () => {
    const errores = [
      { fila: 2, columna: 'Arete', mensaje: 'Falta este dato.' },
      { fila: 2, columna: 'Sexo', mensaje: 'Use una de estas opciones: Macho, Hembra.' },
      { fila: 5, columna: null, mensaje: 'Ese arete ya existe.' },
    ];

    expect(resumenDeRevision({ filas: 10, guardado: false, errores })).toBe(
      '3 problemas en 2 filas. Corrija el archivo y vuelva a subirlo; no se guardó nada.',
    );
  });

  it('ubica cada problema por fila y, si lo tiene, por columna', () => {
    expect(ubicacionDelError({ fila: 4, columna: 'Nacimiento' })).toBe('Fila 4 · Nacimiento');
    expect(ubicacionDelError({ fila: 5, columna: null })).toBe('Fila 5');
  });
});
