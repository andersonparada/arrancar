import { describe, expect, it } from 'vitest';
import { filaDte } from './bandeja.soporte';
import { fraseDeLaBarra, resumenDeLaBarra } from './resumen-de-la-barra';

describe('resumen de la barra de marcados', () => {
  const filas = [
    filaDte({ id: 'a', total: '100.00' }),
    filaDte({ id: 'b', total: '30.00', tipoDte: 'NCRE' }),
    filaDte({ id: 'c', total: '999.00', estadoSat: 'anulado' }),
  ];

  it('deja fuera al anulado y resta la nota de crédito, como Confirmar', () => {
    expect(resumenDeLaBarra(filas)).toEqual({
      marcados: 3,
      registrables: 2,
      noSeRegistran: 1,
      total: '70.00',
      conFaltantes: 1, // la nota de crédito aún no dice qué factura corrige
    });
  });

  it('arma la frase con lo que no se registra', () => {
    expect(fraseDeLaBarra(resumenDeLaBarra(filas))).toEqual({
      marcados: '3 marcados',
      seRegistran: 'se registrarán 2 por',
      conMonto: true,
      noSeRegistran: ' (1 no se registra)',
    });
  });

  it('sin ninguno que registrar no habla de monto', () => {
    const frase = fraseDeLaBarra(resumenDeLaBarra(filas.slice(2)));
    expect(frase).toMatchObject({ marcados: '1 marcado', seRegistran: '', conMonto: false });
    expect(frase.noSeRegistran).toBe(' (ninguno se puede registrar)');
  });

  it('si todo se registra no agrega nada', () => {
    expect(fraseDeLaBarra(resumenDeLaBarra(filas.slice(0, 1))).noSeRegistran).toBe('');
  });
});
