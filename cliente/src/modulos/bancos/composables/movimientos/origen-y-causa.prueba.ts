import { describe, expect, it } from 'vitest';
import { nombreDeModuloDeOrigen, textoDeCausaDeAnulacion, textoDeOrigen } from './origen-y-causa';

describe('origen y causa', () => {
  it('nombra el módulo de origen, conocido o no', () => {
    expect(nombreDeModuloDeOrigen('cuentas-por-pagar')).toBe('Cuentas por pagar');
    expect(nombreDeModuloDeOrigen('activos-fijos')).toBe('Activos fijos');
  });

  it('solo muestra origen si otro módulo generó el movimiento', () => {
    expect(textoDeOrigen({ moduloDeOrigen: 'planilla' })).toBe('Origen: Planilla');
    expect(textoDeOrigen({ moduloDeOrigen: null })).toBeNull();
  });

  it('traduce la causa de anulación', () => {
    expect(textoDeCausaDeAnulacion('manual')).toBe('Manual');
    expect(textoDeCausaDeAnulacion('caducidad')).toBe('Por caducidad');
    expect(textoDeCausaDeAnulacion(null)).toBeNull();
  });
});
