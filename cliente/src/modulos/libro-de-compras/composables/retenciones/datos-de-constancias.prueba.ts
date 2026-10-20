import { describe, expect, it } from 'vitest';
import { ErrorApi } from '@/modulos/core/servicios/cliente-http';
import {
  conFechaEnTodas,
  cuerpoDeConstancias,
  erroresDeConstancias,
  filasConProblemas,
  filasDeConstancias,
  resumenDeConstancias,
  revisarConstancias,
} from './datos-de-constancias';
import { retencion } from './retenciones.soporte';

const filas = filasDeConstancias([retencion({ id: 'a' }), retencion({ id: 'b', retenido: '25.50' })]);

describe('filas de constancias', () => {
  it('empiezan vacías, o con la constancia que ya tenían para corregirla', () => {
    expect(filas.map((f) => [f.numero, f.fecha])).toEqual([
      ['', ''],
      ['', ''],
    ]);
    const [corregir] = filasDeConstancias([retencion({ constanciaNumero: 'C-9', constanciaFecha: '2026-09-12' })]);
    expect(corregir).toMatchObject({ numero: 'C-9', fecha: '2026-09-12' });
  });

  it('la misma fecha se copia a todas', () => {
    expect(conFechaEnTodas(filas, '2026-09-30').map((f) => f.fecha)).toEqual(['2026-09-30', '2026-09-30']);
  });

  it('pide lo que falte, fila por fila', () => {
    const llenas = conFechaEnTodas(filas, '2026-09-30');
    llenas[1]!.numero = ' ';
    expect(revisarConstancias(llenas)).toEqual({
      0: { numero: 'Escriba el número de la constancia.' },
      1: { numero: 'Escriba el número de la constancia.' },
    });
    expect(revisarConstancias(filas)[0]).toHaveProperty('fecha');
  });

  it('manda el número sin espacios sobrantes', () => {
    const [primera] = filasDeConstancias([retencion({ id: 'a' })]);
    primera!.numero = '  C-1 ';
    primera!.fecha = '2026-09-30';
    expect(cuerpoDeConstancias([primera!])).toEqual([{ retencionId: 'a', numero: 'C-1', fecha: '2026-09-30' }]);
  });

  it('resume cuántas son y cuánto suman', () => {
    expect(resumenDeConstancias(filas)).toEqual({ cantidad: 2, total: '75.50' });
  });
});

describe('errores del servidor por fila', () => {
  it('el lote reparte cada problema en su fila y campo', () => {
    const error = new ErrorApi(400, {
      codigo: 'constancias_en_lote_invalidas',
      mensaje: 'Hay constancias con problemas.',
      detalles: {
        filas: [
          { indice: 1, campo: 'fecha', mensaje: 'Anterior a la retención.' },
          { indice: 1, campo: 'numero', mensaje: 'Número inválido.' },
          { indice: 0, campo: 'retencionId', mensaje: 'No existe.' },
        ],
      },
    });
    const errores = erroresDeConstancias(error)!;
    expect(errores[1]).toEqual({ fecha: 'Anterior a la retención.', numero: 'Número inválido.' });
    expect(filasConProblemas(errores)).toBe(2);
  });

  it('una constancia sola pone el error en su campo', () => {
    const error = new ErrorApi(422, {
      codigo: 'constancia_anterior_a_la_retencion',
      mensaje: 'La fecha no puede ser anterior.',
      detalles: { campo: 'fecha' },
    });
    expect(erroresDeConstancias(error)).toEqual({ 0: { fecha: 'La fecha no puede ser anterior.' } });
  });

  it('los errores de validación llegan en una lista de campos', () => {
    const error = new ErrorApi(400, {
      codigo: 'datos_invalidos',
      mensaje: 'Datos inválidos',
      detalles: [{ campo: 'numero', mensaje: 'Campo obligatorio.' }],
    });
    expect(erroresDeConstancias(error)).toEqual({ 0: { numero: 'Campo obligatorio.' } });
  });

  it('un error sin fila ni campo se avisa en general', () => {
    expect(erroresDeConstancias(new ErrorApi(500, { codigo: 'x', mensaje: 'Falló.' }))).toBeNull();
    expect(erroresDeConstancias(new Error('red'))).toBeNull();
  });
});
