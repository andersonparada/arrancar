import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { datosDeBaja, edicionDeBajaNueva, erroresDeBaja, mensajeDeBaja, type EdicionDeBaja } from './edicion-de-baja';

beforeEach(() => setActivePinia(createPinia()));

const base = (): EdicionDeBaja => ({
  ...edicionDeBajaNueva('2026-11-24'),
  causa: 'destruccion',
  descripcion: ' Se quemó ',
  autorizadaPor: ' Ana ',
});
const venta = (): EdicionDeBaja => ({
  ...base(),
  causa: 'venta',
  comprador: ' Pedro ',
  nitDelComprador: '1234567-8',
  precio: '1500.00',
  numeroFel: '55',
  autorizacionFel: 'abc',
});

describe('baja o venta', () => {
  it('pide lo básico con cómo corregirlo', () => {
    const errores = erroresDeBaja(edicionDeBajaNueva('2026-11-24'));
    expect(errores.causa).toMatch(/Elija/);
    expect(errores.descripcion).toBeDefined();
    expect(errores.autorizadaPor).toBeDefined();
    expect(errores['venta.precio']).toBeUndefined();
  });

  it('una baja sin venta no pide datos de venta ni los manda', () => {
    expect(erroresDeBaja(base())).toEqual({});
    expect(datosDeBaja('a1', base())).toMatchObject({
      venta: null,
      costoFiscalDelContador: null,
      descripcion: 'Se quemó',
    });
  });

  it('una venta pide comprador, precio y factura en sus campos', () => {
    const errores = erroresDeBaja({ ...base(), causa: 'venta', precio: 'mucho' });
    expect(Object.keys(errores)).toEqual(
      expect.arrayContaining(['venta.comprador', 'venta.precio', 'venta.numeroFel', 'venta.autorizacionFel']),
    );
    expect(erroresDeBaja(venta())).toEqual({});
  });

  it('el costo del contador exige monto y motivo, y solo viaja si se vende', () => {
    const sostenido = { ...venta(), costoDelContador: true, costoFiscal: '', motivoDelCosto: ' ' };
    const errores = erroresDeBaja(sostenido);
    expect(errores['costoFiscalDelContador.monto']).toBeDefined();
    expect(errores['costoFiscalDelContador.motivo']).toBeDefined();
    const completo = { ...sostenido, costoFiscal: '800.00', motivoDelCosto: 'Factura 12' };
    expect(datosDeBaja('a1', completo).costoFiscalDelContador).toEqual({ monto: '800.00', motivo: 'Factura 12' });
    expect(datosDeBaja('a1', { ...completo, causa: 'robo' }).costoFiscalDelContador).toBeNull();
  });

  it('la confirmación dice a quién y por cuánto, y quién calcula el costo fiscal de un bien de control', () => {
    const texto = mensajeDeBaja('BC-1 · Machete', venta(), true);
    expect(texto).toContain('Pedro');
    expect(texto).toMatch(/costo fiscal lo calcula el sistema/);
    expect(mensajeDeBaja('AF-1 · Tractor', base(), false)).toMatch(/acta numerada/);
  });
});
