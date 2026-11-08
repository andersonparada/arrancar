import { describe, expect, it } from 'vitest';
import type { ResultadoDeVistaPrevia } from '../../servicios/dte-recibidos.api';
import {
  fraseDelResumen,
  netoDeLaFila,
  resumenDeLoRegistrable,
  agruparAvisos,
  textoDeRegistrados,
} from './resumen-de-la-confirmacion';

const lista = (id: string, total: string) =>
  ({ id, documento: { totales: { total } }, avisos: [] }) as unknown as ResultadoDeVistaPrevia;
const conError = (id: string) =>
  ({ id, error: { codigo: 'x', mensaje: 'm', detalles: {} } }) as unknown as ResultadoDeVistaPrevia;
const tipos = new Map([
  ['a', 'FACT'],
  ['b', 'FACT'],
  ['c', 'NCRE'],
  ['d', 'NDEB'],
  ['e', 'FACT'],
]);

describe('resumen de lo que se registra', () => {
  it('suma solo las filas listas, la nota de crédito resta y la de débito suma', () => {
    const resumen = resumenDeLoRegistrable(
      [lista('a', '100.10'), lista('b', '50.00'), lista('c', '30.00'), lista('d', '5.05'), conError('e')],
      tipos,
      5,
    );
    expect(resumen).toMatchObject({ registrables: 4, notasDeCredito: 1, notasDeDebito: 1, total: '125.15' });
  });

  it('la nota de crédito resta también si el servidor la manda en negativo', () => {
    expect(resumenDeLoRegistrable([lista('a', '10.00'), lista('c', '-3.00')], tipos, 2).total).toBe('7.00');
  });

  it('dice documentos y desglosa facturas y notas', () => {
    const resumen = resumenDeLoRegistrable([lista('a', '1.00'), lista('b', '1.00'), lista('c', '1.00')], tipos, 4);
    expect(fraseDelResumen(resumen)).toEqual({
      hayQueRegistrar: true,
      texto: '3 de 4 documentos',
      desglose: '2 facturas, 1 nota de crédito',
    });
  });

  it('sin notas no desglosa', () => {
    const resumen = resumenDeLoRegistrable([lista('a', '1.00')], tipos, 1);
    expect(fraseDelResumen(resumen)).toMatchObject({ texto: '1 de 1 documento', desglose: '' });
  });

  it('si no hay ninguna registrable lo dice sin monto', () => {
    const resumen = resumenDeLoRegistrable([conError('a'), conError('c')], tipos, 17);
    expect(fraseDelResumen(resumen)).toEqual({
      hayQueRegistrar: false,
      texto: 'Ninguno de los 17 marcados se puede registrar todavía.',
      desglose: '',
    });
  });
});

describe('neto de la fila y texto final', () => {
  it('una nota de crédito queda «a favor» y lo demás «neto a pagar»', () => {
    expect(netoDeLaFila('NCRE', '1118.00')).toEqual({ etiqueta: 'A favor', monto: '1118.00' });
    expect(netoDeLaFila('NCRE', '-1118.00')).toEqual({ etiqueta: 'A favor', monto: '1118.00' });
    expect(netoDeLaFila('FACT', '90.00')).toEqual({ etiqueta: 'Neto a pagar', monto: '90.00' });
  });

  it('el aviso final dice documentos', () => {
    expect(textoDeRegistrados(1)).toBe('Se registró 1 documento.');
    expect(textoDeRegistrados(3)).toBe('Se registraron 3 documentos.');
  });
});

describe('agruparAvisos', () => {
  const titulos = new Map([
    ['a', 'A-1'],
    ['b', 'A-2'],
  ]);

  it('junta el mismo aviso de varias filas y no lo repite dentro de una', () => {
    const registradas = [
      { id: 'a', avisos: ['Montos del resumen', 'Montos del resumen', 'Otro'] },
      { id: 'b', avisos: ['Montos del resumen'] },
    ];
    expect(agruparAvisos(registradas, titulos)).toEqual([
      { aviso: 'Montos del resumen', titulos: ['A-1', 'A-2'] },
      { aviso: 'Otro', titulos: ['A-1'] },
    ]);
  });

  it('sin avisos no devuelve nada', () => {
    expect(agruparAvisos([{ id: 'a', avisos: [] }], titulos)).toEqual([]);
  });
});
