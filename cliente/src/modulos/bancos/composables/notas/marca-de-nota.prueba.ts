import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { formatearMonto } from '@/modulos/core/utilidades/formato';
import {
  detallesDeDesglose,
  explicacionDeOrigen,
  insigniaDeNota,
  moduloInactivoQueEspera,
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
  marcadaParaModulo: null,
  moduloDeOrigen: null,
};

describe('marca de la nota', () => {
  it('la etiqueta de marca sale solo si no hay reversión', () => {
    expect(insigniaDeNota({ ...base, marcadaParaModulo: 'cuentas-por-pagar' })).toBe('Para Cuentas por pagar');
    expect(insigniaDeNota({ ...base, marcadaParaModulo: 'cuentas-por-cobrar' })).toBe('Para Cuentas por cobrar');
    expect(insigniaDeNota({ ...base, marcadaParaModulo: 'cuentas-por-pagar', revertidoEn: '2026-01-01' })).toBe(
      'Revertido',
    );
    expect(insigniaDeNota(base)).toBeUndefined();
    expect(insigniaDeNota({ ...base, parteDeApertura: 'error_del_banco' })).toBe('Carga inicial');
    expect(insigniaDeNota({ ...base, parteDeApertura: 'error_del_banco', anuladoEn: '2026-02-01' })).not.toBe(
      'Carga inicial',
    );
  });

  it('marcar exige que el servidor lo permita y el módulo activo', () => {
    expect(ofreceMarcar({ puedeMarcar: true }, true)).toBe(true);
    expect(ofreceMarcar({ puedeMarcar: true }, false)).toBe(false);
    expect(ofreceMarcar({ puedeMarcar: false }, true)).toBe(false);
  });

  it('lo de otro módulo no se corrige y se explica', () => {
    expect(sePuedeCorregir(base)).toBe(true);
    expect(sePuedeCorregir({ ...base, moduloDeOrigen: 'cuentas-por-pagar' })).toBe(false);
    expect(sePuedeCorregir({ ...base, parteDeApertura: 'deposito_en_transito' })).toBe(false);
    expect(explicacionDeOrigen({ moduloDeOrigen: 'cuentas-por-pagar' })).toContain('Cuentas por pagar');
    expect(explicacionDeOrigen({ moduloDeOrigen: null })).toBeNull();
  });

  it('el reparto se muestra línea por línea', () => {
    const desglose = [{ conceptoId: 'a', concepto: 'Pago a proveedores', monto: '100.00' }];
    expect(detallesDeDesglose({ desglose })).toEqual([
      { etiqueta: 'Reparto: Pago a proveedores', valor: formatearMonto('100.00') },
    ]);
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

describe('Cuentas por pagar apagado', () => {
  it('bloquea lo que generó o marcó ese módulo, y solo eso', () => {
    const ninguno = () => false;
    const todos = () => true;
    expect(moduloInactivoQueEspera({ ...base, marcadaParaModulo: 'cuentas-por-pagar' }, ninguno)).toBe(
      'cuentas-por-pagar',
    );
    expect(moduloInactivoQueEspera({ ...base, moduloDeOrigen: 'cuentas-por-pagar' }, ninguno)).toBe(
      'cuentas-por-pagar',
    );
    expect(moduloInactivoQueEspera({ ...base, marcadaParaModulo: 'cuentas-por-pagar' }, todos)).toBeNull();
    expect(moduloInactivoQueEspera(base, ninguno)).toBeNull();
    expect(moduloInactivoQueEspera({ ...base, marcadaParaModulo: 'cuentas-por-cobrar' }, ninguno)).toBe(
      'cuentas-por-cobrar',
    );
  });
});
