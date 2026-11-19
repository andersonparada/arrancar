import { describe, expect, it } from 'vitest';
import type { TipoDeLaSerie, VersionDeTipo } from '../../servicios/tipos-de-cambio.api';
import {
  armarMes,
  encabezadosDeSemana,
  mesDe,
  moverMes,
  nombreDelMes,
  origenDelTipo,
  rangoDelMes,
  resumirMes,
} from './calendario-de-tipos';
import {
  datosDelTipo,
  erroresDelTipo,
  formularioDeTipoDelDia,
  formularioDeTipoNuevo,
  resumenDelGuardado,
  variacionEnPorciento,
  vigenteDelDia,
} from './edicion-de-tipo-manual';

const alReves = (fecha: string) => fecha.split('-').reverse().join('/');

const tipo = (fecha: string, extra: Partial<TipoDeLaSerie> = {}): TipoDeLaSerie => ({
  id: fecha,
  moneda: 'EUR',
  fecha,
  referencia: '8.80000000',
  compra: null,
  venta: null,
  origen: 'banguat',
  registradoEn: '2026-11-18T12:00:00Z',
  ...extra,
});

describe('meses', () => {
  it('mueve el mes con vuelta de año y da su nombre y su rango', () => {
    expect(moverMes('2026-01', -1)).toBe('2025-12');
    expect(moverMes('2026-12', 1)).toBe('2027-01');
    expect(moverMes('2026-11', 0)).toBe('2026-11');
    expect(nombreDelMes('2026-11')).toBe('noviembre de 2026');
    expect(rangoDelMes('2026-02')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' });
    expect(rangoDelMes('2028-02').hasta).toBe('2028-02-29');
    expect(mesDe('2026-11-18')).toBe('2026-11');
  });
});

describe('armarMes', () => {
  const mes = armarMes('2026-11', [tipo('2026-11-02'), tipo('2026-11-18', { origen: 'manual' })], '2026-11-18');

  it('noviembre de 2026 empieza en domingo: seis espacios antes del día 1, con lunes primero', () => {
    expect(mes.espaciosAlInicio).toBe(6);
    expect(mes.dias).toHaveLength(30);
    expect(encabezadosDeSemana()[6]).toBe('dom');
  });

  it('marca hoy, el futuro y los fines de semana, y pone el tipo de cada día', () => {
    expect(mes.dias[0]).toMatchObject({ fecha: '2026-11-01', finDeSemana: true, tipo: null });
    expect(mes.dias[1]?.tipo?.referencia).toBe('8.80000000');
    expect(mes.dias[17]).toMatchObject({ esHoy: true, futuro: false });
    expect(mes.dias[18]).toMatchObject({ futuro: true });
  });

  it('resume: días con tipo, manuales y días hábiles pasados sin tipo (el fin de semana no es falta)', () => {
    // Hábiles pasados: 2 a 6, 9 a 13 y 16 a 18 son 13; el 2 y el 18 tienen tipo.
    expect(resumirMes(mes)).toEqual({ conTipo: 2, manuales: 1, sinTipoEntreSemana: 11 });
  });

  it('dice de dónde salió el valor', () => {
    expect(origenDelTipo(tipo('2026-11-02'))).toBe('Banguat');
    expect(origenDelTipo(tipo('2026-11-02', { origen: 'manual' }))).toBe('Manual');
  });
});

describe('erroresDelTipo', () => {
  const lleno = { ...formularioDeTipoNuevo('EUR', '2026-11-18'), referencia: '8.9', motivo: 'El Banguat no respondió' };

  it('un formulario completo no tiene errores', () => {
    expect(erroresDelTipo(lleno)).toEqual({});
  });

  it('pide el valor, el motivo y la fecha, y dice cómo escribir el número', () => {
    const errores = erroresDelTipo({ ...lleno, referencia: '', motivo: ' ', fecha: '' });

    expect(Object.keys(errores).sort()).toEqual(['fecha', 'motivo', 'referencia']);
    expect(erroresDelTipo({ ...lleno, referencia: '8,9' }).referencia).toMatch(/con punto/);
    expect(erroresDelTipo({ ...lleno, referencia: '0' })).toHaveProperty('referencia');
    expect(erroresDelTipo({ ...lleno, referencia: '1.123456789' })).toHaveProperty('referencia');
  });

  it('compra y venta son opcionales pero, si vienen, se revisan igual', () => {
    expect(erroresDelTipo({ ...lleno, compra: '8.85', venta: '8.95' })).toEqual({});
    expect(erroresDelTipo({ ...lleno, compra: 'abc' })).toHaveProperty('compra');
  });
});

describe('datosDelTipo', () => {
  it('recorta los textos y manda vacíos como nada', () => {
    const form = {
      ...formularioDeTipoNuevo('EUR', '2026-11-18'),
      referencia: ' 8.9 ',
      motivo: ' Comprobante ',
      compra: ' ',
    };

    expect(datosDelTipo(form)).toEqual({
      moneda: 'EUR',
      fecha: '2026-11-18',
      referencia: '8.9',
      compra: null,
      venta: null,
      motivo: 'Comprobante',
    });
  });
});

describe('resumenDelGuardado', () => {
  const version = (referencia: string, origen: 'banguat' | 'manual'): VersionDeTipo => ({
    ...tipo('2026-11-18', { referencia, origen }),
    motivo: null,
    registradoPor: null,
  });
  const base = { ...formularioDeTipoDelDia('EUR', '2026-11-18'), referencia: '8.9', motivo: 'Corrección' };

  it('sin valor previo dice que el día aún no tiene tipo', () => {
    expect(resumenDelGuardado(base, alReves)).toBe(
      'Se registrará Q 8.90000 por unidad de EUR para el 18/11/2026. Ese día aún no tiene tipo.',
    );
  });

  it('con valor previo dice a quién reemplaza y que queda en el historial', () => {
    const resumen = resumenDelGuardado({ ...base, versiones: [version('8.85000000', 'banguat')] }, alReves);

    expect(resumen).toContain('Reemplaza al vigente (Q 8.85000, del Banguat)');
    expect(resumen).toContain('queda en el historial');
    expect(resumen).not.toContain('revise');
  });

  it('avisa si cambia más de 3 % contra el vigente', () => {
    const resumen = resumenDelGuardado({ ...base, referencia: '9.5', versiones: [version('8.85', 'manual')] }, alReves);

    expect(resumen).toContain('ingresado a mano');
    expect(resumen).toMatch(/7\.3 % más que el vigente/);
  });

  it('el vigente es la versión más nueva y la variación sin valor previo no se calcula', () => {
    expect(vigenteDelDia({ ...base, versiones: [version('8', 'manual'), version('7', 'banguat')] })?.referencia).toBe(
      '8',
    );
    expect(variacionEnPorciento('9', null)).toBeNull();
    expect(variacionEnPorciento('9', '10')).toBeCloseTo(-10);
  });
});
