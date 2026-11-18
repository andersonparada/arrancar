import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  hayNotasAplicadas,
  leyendaDePosfechado,
  lineasDeLaEmpresa,
  textoDeRetenciones,
  textoDelMedio,
  tituloDelPapelDelPago,
} from './comprobante-de-pago';

beforeEach(() => setActivePinia(createPinia()));

describe('comprobante de pago', () => {
  it('lee el cheque o la nota con su cuenta', () => {
    expect(textoDelMedio({ cuentaBancariaNombre: 'Monetaria', tipo: 'cheque', numero: 1523 })).toBe(
      'Cheque 1523 · Monetaria',
    );
    expect(textoDelMedio({ cuentaBancariaNombre: 'Monetaria', tipo: 'nota_de_debito', numero: 45 })).toBe(
      'Nota de débito 45 · Monetaria',
    );
  });

  it('un cheque posfechado lleva su leyenda con la fecha; uno normal, ninguna', () => {
    expect(leyendaDePosfechado({ posfechado: true, fecha: '2026-12-20' })).toContain('Cheque posfechado al');
    expect(leyendaDePosfechado({ posfechado: false, fecha: '2026-11-20' })).toBeNull();
  });

  it('cada retención lleva el número de constancia o «por emitir»', () => {
    const textos = textoDeRetenciones([
      { impuesto: 'iva', monto: '60.00', fecha: '2026-10-05', constanciaNumero: 'A-1', porEmitir: false },
      { impuesto: 'isr', monto: '5.00', fecha: '2026-10-05', constanciaNumero: null, porEmitir: true },
    ]);
    expect(textos[0]).toMatch(/IVA .* · constancia A-1/);
    expect(textos[1]).toMatch(/ISR .* · constancia por emitir/);
  });

  it('la columna de notas solo se llena si alguna rebajó el documento', () => {
    expect(hayNotasAplicadas({ notasAplicadas: '0.00' })).toBe(false);
    expect(hayNotasAplicadas({ notasAplicadas: '25.00' })).toBe(true);
  });

  it('el nombre del PDF lleva el pago y el proveedor', () => {
    expect(
      tituloDelPapelDelPago({
        pago: { numero: '2026-7' } as never,
        proveedor: { id: 'p', nombre: 'Agro', nit: null },
      }),
    ).toBe('Pago 2026-7 - Agro');
  });

  it('la razón social manda y el nombre comercial solo sale si es distinto', () => {
    const base = { nombre: 'Rancho', nit: null, razonSocial: 'Rancho, S.A.', nombreComercial: 'Rancho' };
    expect(lineasDeLaEmpresa(base)).toEqual({ principal: 'Rancho, S.A.', comercial: 'Rancho' });
    expect(lineasDeLaEmpresa({ ...base, nombreComercial: 'Rancho, S.A.' }).comercial).toBeNull();
    expect(lineasDeLaEmpresa({ ...base, razonSocial: null }).principal).toBe('Rancho');
  });
});
