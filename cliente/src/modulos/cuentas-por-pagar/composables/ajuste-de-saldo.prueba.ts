import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FichaDelDocumento } from '../servicios/tipos';
import {
  ayudaDeLaCausa,
  causaDeDiferenciaMenorApagada,
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
    const textos = opcionesDeCausaDeAjuste('25.00').map((opcion) => opcion.texto);
    expect(textos[0]).toBe('Escoja la causa');
    expect(textos.slice(1)).toEqual([...textos.slice(1)].sort((a, b) => a.localeCompare(b, 'es')));
    expect(textos).toHaveLength(4);
  });

  it('no ofrece «Diferencia menor» si el tope de la empresa es cero', () => {
    const valores = opcionesDeCausaDeAjuste('0.00').map((opcion) => opcion.valor);
    expect(valores).not.toContain('diferencia_menor');
    expect(valores).toHaveLength(3);
    expect(causaDeDiferenciaMenorApagada('0.00')).toBe(true);
    expect(causaDeDiferenciaMenorApagada('0.01')).toBe(false);
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

  it('con el tope en cero dice que la causa está desactivada, no «hasta Q 0.00»', () => {
    const sinTope = { ...ficha, topeDiferenciaMenor: '0.00' } as FichaDelDocumento;
    const error = erroresDeAjuste(llena({ causa: 'diferencia_menor', monto: '1.00' }), sinTope, HOY).monto;
    expect(error).toMatch(/desactivada para esta empresa/);
    expect(error).not.toMatch(/hasta/i);
  });

  it('una referencia de más de 100 caracteres da error con cuántos sobran, no se corta', () => {
    const error = erroresDeAjuste(llena({ referencia: 'x'.repeat(103) }), ficha, HOY).referencia;
    expect(error).toBe('Sobran 3 caracteres. Acórtelo a 100 o menos.');
    expect(erroresDeAjuste(llena({ referencia: 'x'.repeat(100) }), ficha, HOY).referencia).toBeUndefined();
  });

  it('la fecha mínima dice si viene de la recepción de la nota o del inicio de la empresa', () => {
    const deLibro = { ...ficha, origen: 'libro_de_compras' } as FichaDelDocumento;
    const inicial = { ...ficha, origen: 'saldo_inicial' } as FichaDelDocumento;
    expect(erroresDeAjuste(llena({ fecha: '2026-10-04' }), deLibro, HOY).fecha).toMatch(/cuando se recibió la nota\.$/);
    expect(erroresDeAjuste(llena({ fecha: '2026-10-04' }), inicial, HOY).fecha).toMatch(
      /fecha de inicio de la empresa con saldos iniciales\.$/,
    );
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
  it('acepta el monto como número (el campo numérico lo entrega así)', () => {
    const edicion = llena({ monto: 25 as unknown as string });
    expect(erroresDeAjuste(edicion, ficha, HOY).monto).toBeUndefined();
    expect(datosDeAjuste(edicion).monto).toBe('25');
  });

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
