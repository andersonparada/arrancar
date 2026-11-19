import { describe, expect, it } from 'vitest';
import { comprobanteDeEjemplo } from '../ejemplos.soporte';
import { edicionDeEntrega } from '../fondos/edicion-de-fondo';
import {
  cuerpoDeReposicion,
  faltantesDeLaReposicion,
  idsPorOmision,
  resumenDeReposicion,
} from './edicion-de-reposicion';
import { agruparLasLineas, lineasDeLosPendientes } from './impresion-de-reposicion';

const factura = comprobanteDeEjemplo({ id: 'a', monto: '100.00' });
const nota = comprobanteDeEjemplo({ id: 'b', monto: '30.50', resta: true, esNotaDeCredito: true });
const faltante = comprobanteDeEjemplo({ id: 'c', monto: '20.00', clase: 'faltante', documento: null });
const activo = comprobanteDeEjemplo({ id: 'd', monto: '500.00', conActivoFijo: true });
const pendientes = [factura, nota, faltante, activo];

describe('resumen de la reposición', () => {
  it('elige todo lo pendiente por omisión', () => {
    expect(idsPorOmision(pendientes)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('suma firmado: lo que resta baja el total', () => {
    const resumen = resumenDeReposicion(pendientes, ['a', 'b', 'c', 'd']);
    expect(resumen).toMatchObject({ cantidad: 4, total: '589.50', notasDeCredito: 1, faltantes: 1, esTodo: true });
  });

  it('con una selección parcial no es todo, y sin nada el total es cero', () => {
    expect(resumenDeReposicion(pendientes, ['a'])).toMatchObject({ total: '100.00', esTodo: false });
    expect(resumenDeReposicion(pendientes, [])).toMatchObject({ cantidad: 0, total: '0.00' });
  });

  it('muestra un total negativo cuando solo se eligen notas de crédito', () => {
    expect(resumenDeReposicion(pendientes, ['b']).total).toBe('-30.50');
  });
});

describe('cuerpo de la reposición', () => {
  it('pide la chequera y escoger al menos un comprobante', () => {
    const faltantes = faltantesDeLaReposicion(edicionDeEntrega(), []);
    expect(Object.keys(faltantes).sort()).toEqual(['chequeraId', 'comprobanteIds']);
  });

  it('con nota de débito pide la cuenta, no la chequera', () => {
    const edicion = { ...edicionDeEntrega(), forma: 'nota_de_debito' as const };
    expect(Object.keys(faltantesDeLaReposicion(edicion, ['a']))).toEqual(['cuentaBancariaId']);
  });

  it('el cheque sale a nombre del custodio si no se escribe beneficiario', () => {
    const edicion = { ...edicionDeEntrega(), medioId: 'ch-1', fecha: ' 2026-11-10 ' };
    expect(cuerpoDeReposicion(edicion, ['a'], 'Ana López')).toEqual({
      forma: 'cheque',
      comprobanteIds: ['a'],
      fecha: '2026-11-10',
      observaciones: null,
      chequeraId: 'ch-1',
      beneficiario: 'Ana López',
      noNegociable: true,
    });
  });

  it('la nota de débito lleva la cuenta y la referencia', () => {
    const edicion = { ...edicionDeEntrega(), forma: 'nota_de_debito' as const, medioId: 'c-1', referencia: ' R-9 ' };
    expect(cuerpoDeReposicion(edicion, ['a'], null)).toMatchObject({
      forma: 'nota_de_debito',
      cuentaBancariaId: 'c-1',
      referencia: 'R-9',
    });
  });
});

describe('hoja impresa de la reposición', () => {
  it('reparte los comprobantes por concepto y suma cada grupo con signo', () => {
    const grupos = agruparLasLineas(lineasDeLosPendientes(pendientes));
    expect(grupos.map(({ titulo, subtotal }) => [titulo, subtotal])).toEqual([
      ['Gastos de operación', '100.00'],
      ['Compras de activo fijo', '500.00'],
      ['Faltantes de efectivo', '20.00'],
      ['Descuentan: notas de crédito y sobrantes', '-30.50'],
    ]);
  });

  it('no muestra los grupos vacíos', () => {
    expect(agruparLasLineas(lineasDeLosPendientes([factura])).map(({ titulo }) => titulo)).toEqual([
      'Gastos de operación',
    ]);
  });
});
