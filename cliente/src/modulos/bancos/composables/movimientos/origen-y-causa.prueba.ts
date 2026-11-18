import { describe, expect, it } from 'vitest';
import {
  destinoDeOrigenDelPago,
  nombreDeModuloDeOrigen,
  textoDeCausaDeAnulacion,
  textoDeOrigen,
} from './origen-y-causa';

describe('origen y causa', () => {
  it('nombra el módulo de origen, conocido o no', () => {
    expect(nombreDeModuloDeOrigen('cuentas-por-pagar')).toBe('Cuentas por pagar');
    expect(nombreDeModuloDeOrigen('activos-fijos')).toBe('Activos fijos');
  });

  it('solo muestra origen si otro módulo generó el movimiento', () => {
    expect(textoDeOrigen({ moduloDeOrigen: 'planilla' })).toBe('Origen: Planilla');
    expect(textoDeOrigen({ moduloDeOrigen: null })).toBeNull();
  });

  it('el origen de Cuentas por pagar lleva a la ficha del pago; otro origen, a ninguna parte', () => {
    expect(destinoDeOrigenDelPago({ moduloDeOrigen: 'cuentas-por-pagar', documentoDeOrigenId: 'p1' })).toEqual({
      name: 'cuentas-por-pagar.pagos.ficha',
      params: { id: 'p1' },
    });
    expect(
      destinoDeOrigenDelPago({ moduloDeOrigen: 'cuentas-por-pagar', documentoDeOrigenId: 'p1', tipo: 'credito' }),
    ).toBeNull();
    expect(destinoDeOrigenDelPago({ moduloDeOrigen: 'planilla', documentoDeOrigenId: 'x' })).toBeNull();
    expect(destinoDeOrigenDelPago({ moduloDeOrigen: 'cuentas-por-pagar', documentoDeOrigenId: null })).toBeNull();
  });

  it('traduce la causa de anulación', () => {
    expect(textoDeCausaDeAnulacion('manual')).toBe('Manual');
    expect(textoDeCausaDeAnulacion('caducidad')).toBe('Por caducidad');
    expect(textoDeCausaDeAnulacion(null)).toBeNull();
  });
});
