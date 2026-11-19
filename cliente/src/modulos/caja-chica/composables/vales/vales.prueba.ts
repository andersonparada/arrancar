import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { edicionDeAsignacion } from '../comprobantes/armado-de-asignacion';
import { edicionDeVale, faltaDelGastoSinFactura, type EdicionDeVale } from '../comprobantes/edicion-de-vale';
import { comprobanteDeEjemplo } from '../ejemplos.soporte';
import { cuadroDeLaLiquidacion, cuerpoDeLaLiquidacion, resumenDeLaConfirmacion } from './edicion-de-liquidacion';
import { cuerpoDeEntregaDeVale, edicionDeEntregaDeVale, faltaDeLaEntregaDelVale } from './edicion-de-vale-provisional';

beforeEach(() => setActivePinia(createPinia()));

const documento = (id: string, monto: string, resta = false) => ({
  ...comprobanteDeEjemplo({ id, monto, resta }),
  puedeAsignarConRetencion: false,
});
const gasto = (monto: string): EdicionDeVale => ({
  ...edicionDeVale(),
  monto,
  descripcion: 'Pasajes',
  pagadoA: 'Bus',
  conceptoDeGastoId: 'g-1',
  motivoSinDocumento: 'No dieron factura',
});

describe('entregar un vale provisional', () => {
  it('pide el monto, a quién y para qué', () => {
    expect(Object.keys(faltaDeLaEntregaDelVale(edicionDeEntregaDeVale())).sort()).toEqual([
      'entregadoA',
      'monto',
      'motivo',
    ]);
  });

  it('con un usuario elegido no hace falta escribir el nombre; un monto en cero no sirve', () => {
    const edicion = {
      ...edicionDeEntregaDeVale(),
      monto: '0',
      entregadoAUsuarioId: 'u-1',
      motivo: 'Compra de repuestos',
    };
    expect(Object.keys(faltaDeLaEntregaDelVale(edicion))).toEqual(['monto']);
  });

  it('el cuerpo lleva el monto escrito, sin fecha si se dejó vacía', () => {
    const edicion = { ...edicionDeEntregaDeVale(), monto: ' 250.5 ', entregadoA: ' Luis ', motivo: ' Repuestos ' };
    expect(cuerpoDeEntregaDeVale(edicion)).toEqual({
      monto: '250.5',
      entregadoA: 'Luis',
      entregadoAUsuarioId: null,
      motivo: 'Repuestos',
    });
  });
});

describe('liquidar un vale provisional', () => {
  const vale = { numero: 3, monto: '500.00' };

  it('calcula lo gastado y lo que regresa al fondo', () => {
    const cuadro = cuadroDeLaLiquidacion(vale, {
      documentos: [documento('a', '200.00'), documento('b', '50.00', true)],
      gastos: [gasto('100.50')],
    });
    expect(cuadro).toEqual({
      documentos: 2,
      gastosSinFactura: 1,
      gastado: '250.50',
      devuelto: '249.50',
      deMas: '0.00',
    });
  });

  it('si se gastó de más no devuelve nada y dice cuánto salió del fondo', () => {
    const cuadro = cuadroDeLaLiquidacion(vale, { documentos: [documento('a', '620.00')], gastos: [] });
    expect(cuadro).toMatchObject({ devuelto: '0.00', deMas: '120.00' });
  });

  it('sin comprobantes regresa todo el vale', () => {
    expect(cuadroDeLaLiquidacion(vale, { documentos: [], gastos: [] })).toMatchObject({
      gastado: '0.00',
      devuelto: '500.00',
    });
  });

  it('el cuerpo trae los documentos con sus motivos y los gastos sin factura', () => {
    const edicion = { ...edicionDeAsignacion(), fecha: '2026-11-05' };
    const cuerpo = cuerpoDeLaLiquidacion({ documentos: [documento('a', '10.00')], gastos: [gasto('5')] }, edicion);
    expect(cuerpo.fecha).toBe('2026-11-05');
    expect(cuerpo.documentos).toEqual([
      { comprobanteId: 'a', fecha: '2026-11-05', motivoSobreElTope: null, motivoConRetencion: null },
    ]);
    expect(cuerpo.valesDeGasto[0]).toMatchObject({ monto: '5', pagadoA: 'Bus', conceptoDeGastoId: 'g-1' });
  });

  it('la confirmación dice con qué se liquida', () => {
    const cuadro = cuadroDeLaLiquidacion(vale, { documentos: [documento('a', '200.00')], gastos: [gasto('10')] });
    expect(resumenDeLaConfirmacion(vale, cuadro)).toContain('1 documento y 1 gasto sin factura');
    const vacio = cuadroDeLaLiquidacion(vale, { documentos: [], gastos: [] });
    expect(resumenDeLaConfirmacion(vale, vacio)).toContain('ningún comprobante');
  });
});

describe('gasto sin factura armado en la liquidación', () => {
  it('pide todo lo que pide el servidor', () => {
    expect(Object.keys(faltaDelGastoSinFactura(edicionDeVale())).sort()).toEqual([
      'conceptoDeGastoId',
      'descripcion',
      'monto',
      'motivoSinDocumento',
      'pagadoA',
    ]);
    expect(faltaDelGastoSinFactura(gasto('12.5'))).toEqual({});
  });
});
