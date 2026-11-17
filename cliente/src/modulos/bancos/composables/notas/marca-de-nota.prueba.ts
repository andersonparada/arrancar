import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  detallesDeDesglose,
  explicacionDeOrigen,
  insigniaDeNota,
  ofreceCasillaDeMarca,
  ofreceMarcar,
  resumenDeMarcado,
  sePuedeCorregir,
} from './marca-de-nota';

beforeEach(() => setActivePinia(createPinia()));

const base = {
  anuladoEn: null,
  revertidoEn: null,
  revierteAId: null,
  marcadaParaCuentasPorPagar: false,
  moduloDeOrigen: null,
};

describe('marca de la nota', () => {
  it('la etiqueta de marca sale solo si no hay reversión', () => {
    expect(insigniaDeNota({ ...base, marcadaParaCuentasPorPagar: true })).toBe('Para Cuentas por pagar');
    expect(insigniaDeNota({ ...base, marcadaParaCuentasPorPagar: true, revertidoEn: '2026-01-01' })).toBe('Revertido');
    expect(insigniaDeNota(base)).toBeUndefined();
  });

  it('marcar exige que el servidor lo permita y el módulo activo', () => {
    expect(ofreceMarcar({ puedeMarcar: true }, true)).toBe(true);
    expect(ofreceMarcar({ puedeMarcar: true }, false)).toBe(false);
    expect(ofreceMarcar({ puedeMarcar: false }, true)).toBe(false);
  });

  it('lo de otro módulo no se corrige y se explica', () => {
    expect(sePuedeCorregir(base)).toBe(true);
    expect(sePuedeCorregir({ ...base, moduloDeOrigen: 'cuentas-por-pagar' })).toBe(false);
    expect(explicacionDeOrigen({ moduloDeOrigen: 'cuentas-por-pagar' })).toContain('Cuentas por pagar');
    expect(explicacionDeOrigen({ moduloDeOrigen: null })).toBeNull();
  });

  it('el reparto se muestra línea por línea', () => {
    const desglose = [{ conceptoId: 'a', concepto: 'Pago a proveedores', monto: '100.00' }];
    expect(detallesDeDesglose({ desglose })).toEqual([{ etiqueta: 'Reparto: Pago a proveedores', valor: 'Q 100.00' }]);
    expect(detallesDeDesglose({ desglose: [] })).toEqual([]);
  });

  it('la casilla solo sale al registrar una nota de débito con el módulo activo', () => {
    expect(ofreceCasillaDeMarca({ id: null, tipo: 'debito' }, true)).toBe(true);
    expect(ofreceCasillaDeMarca({ id: null, tipo: 'credito' }, true)).toBe(false);
    expect(ofreceCasillaDeMarca({ id: 'x', tipo: 'debito' }, true)).toBe(false);
    expect(ofreceCasillaDeMarca({ id: null, tipo: 'debito' }, false)).toBe(false);
  });

  it('el resumen nombra la nota y el monto', () => {
    expect(resumenDeMarcado({ monto: '50.00', referencia: 'Seguro', beneficiario: null })).toContain('«Seguro»');
  });
});
