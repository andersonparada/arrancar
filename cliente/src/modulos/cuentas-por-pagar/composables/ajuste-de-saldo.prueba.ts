import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FichaDelDocumento } from '../servicios/tipos';
import {
  ayudaDeLaCausa,
  datosDeAjuste,
  edicionDeAjuste,
  erroresDeAjuste,
  esDeAnioAnterior,
  opcionesDeCausaDeAjuste,
} from './ajuste-de-saldo';

// Los formatos de fecha y monto leen la sesión (Pinia).
beforeEach(() => setActivePinia(createPinia()));

const HOY = '2026-11-13';
const ficha = { saldo: '100.00', fechaMinimaDeAjuste: '2026-10-05', topeDiferenciaMenor: '25.00' } as FichaDelDocumento;

function llena(cambios: Partial<ReturnType<typeof edicionDeAjuste>> = {}) {
  return {
    ...edicionDeAjuste('100.00', HOY),
    causa: 'no_recuperable' as const,
    motivo: 'El proveedor cerró',
    ...cambios,
  };
}

describe('edicionDeAjuste', () => {
  it('propone todo el saldo libre y la fecha de hoy', () => {
    expect(edicionDeAjuste('100.00', HOY)).toMatchObject({ abierta: true, monto: '100.00', fecha: HOY, causa: '' });
  });
});

describe('esDeAnioAnterior', () => {
  it('avisa solo con un año anterior al de hoy', () => {
    expect(esDeAnioAnterior('2025-12-31', HOY)).toBe(true);
    expect(esDeAnioAnterior('2026-01-01', HOY)).toBe(false);
    expect(esDeAnioAnterior('', HOY)).toBe(false);
  });
});

describe('opcionesDeCausaDeAjuste', () => {
  it('invita a escoger y ordena por nombre', () => {
    const textos = opcionesDeCausaDeAjuste().map((opcion) => opcion.texto);
    expect(textos[0]).toBe('Escoja la causa');
    expect(textos.slice(1)).toEqual([...textos.slice(1)].sort((a, b) => a.localeCompare(b, 'es')));
  });
});

describe('ayudaDeLaCausa', () => {
  const ayudas = { no_recuperable: 'A', diferencia_menor: 'B', compensado_con_otra_cuenta: 'C' };
  it('en diferencia menor dice el tope', () => {
    expect(ayudaDeLaCausa('diferencia_menor', '25.00', ayudas)).toMatch(/^B Hasta .*25/);
    expect(ayudaDeLaCausa('no_recuperable', '25.00', ayudas)).toBe('A');
    expect(ayudaDeLaCausa('', '25.00', ayudas)).toBe('');
  });
});

describe('erroresDeAjuste', () => {
  it('acepta un ajuste completo', () => {
    expect(erroresDeAjuste(llena(), ficha, HOY)).toEqual({});
  });

  it('exige causa y motivo, y no deja pasar del saldo libre', () => {
    const errores = erroresDeAjuste(llena({ causa: '', motivo: '', monto: '100.01' }), ficha, HOY);
    expect(Object.keys(errores).sort()).toEqual(['causa', 'monto', 'motivo']);
  });

  it('respeta el tope de la diferencia menor', () => {
    expect(erroresDeAjuste(llena({ causa: 'diferencia_menor', monto: '25.01' }), ficha, HOY).monto).toMatch(/hasta/);
    expect(erroresDeAjuste(llena({ causa: 'diferencia_menor', monto: '25.00' }), ficha, HOY)).toEqual({});
  });

  it('pide la referencia al compensar con otra cuenta', () => {
    expect(erroresDeAjuste(llena({ causa: 'compensado_con_otra_cuenta' }), ficha, HOY).referencia).toMatch(/compensó/);
    expect(erroresDeAjuste(llena({ causa: 'compensado_con_otra_cuenta', referencia: 'FV-9' }), ficha, HOY)).toEqual({});
  });

  it('revisa la fecha: futura y anterior a la recepción', () => {
    expect(erroresDeAjuste(llena({ fecha: '2026-11-14' }), ficha, HOY).fecha).toMatch(/futura/);
    expect(erroresDeAjuste(llena({ fecha: '2026-10-04' }), ficha, HOY).fecha).toMatch(/anterior/);
  });
});

describe('datosDeAjuste', () => {
  it('recorta y deja la referencia vacía como nula', () => {
    expect(datosDeAjuste(llena({ motivo: ' cerró ', referencia: ' ' }))).toEqual({
      monto: '100.00',
      fecha: HOY,
      causa: 'no_recuperable',
      motivo: 'cerró',
      referencia: null,
    });
  });
});
