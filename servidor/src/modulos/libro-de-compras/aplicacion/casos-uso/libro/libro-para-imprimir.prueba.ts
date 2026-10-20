import { describe, expect, it } from 'vitest';
import { COLUMNAS_DE_DINERO, type FilaDelLibro } from '../../../dominio/libro/fila-del-libro.js';
import { libroDelPeriodo } from '../../../dominio/libro/libro-del-periodo.js';
import { LibroConDemasiadasFilas } from '../../errores-de-emision.js';
import type { LibroArmado } from './consultar-libro.js';
import { hojasDelLibro } from './hojas-del-libro.js';
import { huellaDelLibro, libroParaImprimir, MAXIMO_DE_FILAS_DEL_PDF } from './libro-para-imprimir.js';

function fila(numero: number, total = 100): FilaDelLibro {
  const montos = Object.fromEntries(COLUMNAS_DE_DINERO.map((columna) => [columna, 0]));
  return {
    ...montos,
    documentoId: `d${numero}`,
    proveedorId: 'p',
    numeroDeFila: numero,
    fecha: '2026-10-01',
    tipoDte: 'FACT',
    serie: 'A',
    numero: String(numero),
    nit: '1234567',
    nombre: 'Proveedor',
    motivo: null,
    siglaDelMotivo: null,
    total,
  } as FilaDelLibro;
}

function armado(filas: FilaDelLibro[]): LibroArmado {
  const libro = { ...libroDelPeriodo([], 'completo'), filas };
  return { libro, periodo: '2026-10-01', empresa: { nombre: 'Rancho', nit: '123' } };
}

describe('libroParaImprimir', () => {
  it('con el tope de filas todavía imprime; con una más, no', () => {
    const justo = Array.from({ length: MAXIMO_DE_FILAS_DEL_PDF }, (_, i) => fila(i + 1));

    expect(libroParaImprimir(armado(justo), 1).libro.hojas).toBe(Math.ceil(MAXIMO_DE_FILAS_DEL_PDF / 32) + 1);
    expect(() => libroParaImprimir(armado([...justo, fila(5001)]), 1)).toThrow(LibroConDemasiadasFilas);
  });

  it('el borrador no lleva folio', () => {
    expect(libroParaImprimir(armado([fila(1)]), null).primerFolio).toBeNull();
  });
});

describe('huellaDelLibro', () => {
  it('es la misma con los mismos datos y cambia si cambia un monto o el orden', () => {
    const base = huellaDelLibro([fila(1), fila(2)]);

    expect(huellaDelLibro([fila(1), fila(2)])).toBe(base);
    expect(huellaDelLibro([fila(1), fila(2, 101)])).not.toBe(base);
    expect(huellaDelLibro([fila(2), fila(1)])).not.toBe(base);
    expect(base).toHaveLength(64);
  });
});

describe('hojasDelLibro (Excel)', () => {
  it('arma Libro, Resumen y Anulados con el dinero como número', () => {
    const hojas = hojasDelLibro(armado([fila(1, 11250)]), []);

    expect(hojas.map((hoja) => hoja.nombre)).toEqual(['Libro', 'Resumen', 'Anulados']);
    expect(hojas[0]!.encabezados).toContain('IVA crédito fiscal');
    expect(hojas[0]!.filas[0]).toContain(112.5);
    expect(hojas[2]!.filas).toEqual([]);
  });
});
