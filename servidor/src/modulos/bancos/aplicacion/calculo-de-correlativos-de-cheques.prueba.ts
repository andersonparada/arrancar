import { describe, expect, it } from 'vitest';
import { numerosDelReporte, resumenDelReporte } from './calculo-de-correlativos-de-cheques.js';
import type { ChequeDelCorrelativo } from './puertos/consultas-de-correlativos-de-cheques.js';

const cheque = (numero: number, cambios: Partial<ChequeDelCorrelativo> = {}): ChequeDelCorrelativo => ({
  id: `cheque-${numero}`,
  numero,
  estado: 'disponible',
  causa: null,
  impresoEn: null,
  motivoDeAnulacion: null,
  movimiento: null,
  ...cambios,
});

const emitido = (numero: number, cambios: Partial<ChequeDelCorrelativo> = {}) =>
  cheque(numero, {
    estado: 'emitido',
    movimiento: { fecha: '2026-11-18', beneficiario: 'Juan Pérez', montoCentavos: 112000 },
    ...cambios,
  });

const anulado = (numero: number, causa: ChequeDelCorrelativo['causa']) =>
  cheque(numero, { estado: 'anulado', causa, motivoDeAnulacion: 'Motivo' });

const rango = { desde: 1, hasta: 8, deApertura: false };

/** Un rango completo con cada estado y causa. */
const completa = [
  emitido(1, { impresoEn: new Date('2026-11-18T10:00:00Z') }),
  anulado(2, 'inutilizado'),
  emitido(3),
  anulado(4, 'manual'),
  anulado(5, 'caducidad'),
  anulado(6, 'extraviado'),
  cheque(7),
  cheque(8),
];

describe('los números de la chequera', () => {
  it('salen todos, en orden, con su detalle y a dónde pasó el inutilizado', () => {
    const numeros = numerosDelReporte(completa, rango, new Map([['cheque-2', 3]]));

    expect(numeros.map((n) => [n.numero, n.estado, n.causa])).toEqual([
      [1, 'emitido', null],
      [2, 'inutilizado', null],
      [3, 'emitido', null],
      [4, 'anulado', 'manual'],
      [5, 'anulado', 'caducidad'],
      [6, 'anulado', 'extraviado'],
      [7, 'disponible', null],
      [8, 'disponible', null],
    ]);
    expect(numeros[0]).toMatchObject({
      fecha: '2026-11-18',
      beneficiario: 'Juan Pérez',
      monto: '1120.00',
      impreso: true,
      impresoEn: '2026-11-18T10:00:00.000Z',
    });
    expect(numeros[1]).toMatchObject({ pasoAlNumero: 3, motivoDeAnulacion: 'Motivo', impreso: false });
    expect(numeros[3]!.pasoAlNumero).toBeNull();
  });

  it('un número del rango sin fila sale como sin registro', () => {
    const sinElCuatro = completa.filter(({ numero }) => numero !== 4);

    const numeros = numerosDelReporte(sinElCuatro, rango, new Map());

    expect(numeros[3]).toMatchObject({ numero: 4, estado: 'sin_registro', fecha: null, monto: null });
  });
});

describe('el resumen', () => {
  it('cuenta cada estado y causa y da el total del rango', () => {
    const resumen = resumenDelReporte(numerosDelReporte(completa, rango, new Map()), rango);

    expect(resumen).toEqual({
      emitidos: 2,
      anulados: { total: 3, manual: 1, caducidad: 1, extraviado: 1 },
      inutilizados: 1,
      disponibles: 2,
      totalDelRango: 8,
      alerta: null,
    });
    const suma = resumen.emitidos + resumen.anulados.total + resumen.inutilizados + resumen.disponibles;
    expect(suma).toBe(resumen.totalDelRango);
  });

  it('alerta si un número no tiene fila: no cuadra con el total', () => {
    const sinDos = completa.filter(({ numero }) => ![4, 5].includes(numero));

    const resumen = resumenDelReporte(numerosDelReporte(sinDos, rango, new Map()), rango);

    expect(resumen.alerta).toBe('Alerta: no hay cheque registrado para los números 4, 5.');
    expect(resumen.anulados.total).toBe(1);
    expect(resumen.totalDelRango).toBe(8);
  });

  it('un solo número sin fila lo dice en singular', () => {
    const sinUno = completa.filter(({ numero }) => numero !== 8);

    const resumen = resumenDelReporte(numerosDelReporte(sinUno, rango, new Map()), rango);

    expect(resumen.alerta).toBe('Alerta: no hay cheque registrado para el número 8.');
  });
});

describe('una chequera de la carga inicial', () => {
  const apertura = { desde: 3, hasta: 9, deApertura: true };

  it('solo muestra los cheques que tiene: su rango tiene huecos por diseño y no alerta', () => {
    const cheques = [emitido(3), emitido(9)];

    const numeros = numerosDelReporte(cheques, apertura, new Map());
    const resumen = resumenDelReporte(numeros, apertura);

    expect(numeros.map((n) => n.numero)).toEqual([3, 9]);
    expect(resumen).toMatchObject({ emitidos: 2, totalDelRango: 2, alerta: null });
  });
});
