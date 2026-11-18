import { describe, expect, it } from 'vitest';
import { fechasDelRango, fechaDelBanguatAIso, fechaIsoAlBanguat } from './fechas-de-publicacion.js';
import { DIAS_DE_RELLENO, fechasSinPublicacion, rangoDeRelleno } from './huecos-de-publicacion.js';
import {
  dentroDeLaBanda,
  referenciaEscalada,
  validarPublicacion,
  variacionSuperaElLimite,
} from './reglas-de-publicacion.js';

const HOY = '2026-11-18';

describe('fechas del Banguat', () => {
  it('convierte dd/mm/aaaa a ISO y de vuelta', () => {
    expect(fechaDelBanguatAIso('18/11/2026')).toBe('2026-11-18');
    expect(fechaIsoAlBanguat('2026-11-18')).toBe('18/11/2026');
  });

  it('rechaza fechas que no existen o con otro formato', () => {
    expect(fechaDelBanguatAIso('31/02/2026')).toBeUndefined();
    expect(fechaDelBanguatAIso('2026-11-18')).toBeUndefined();
    expect(fechaDelBanguatAIso('1/1/2026')).toBeUndefined();
  });

  it('enumera un rango con ambos extremos', () => {
    expect(fechasDelRango('2026-02-27', '2026-03-01')).toEqual(['2026-02-27', '2026-02-28', '2026-03-01']);
  });
});

describe('referencia', () => {
  it('escala a 8 decimales con enteros', () => {
    expect(referenciaEscalada('7.64489')).toBe(764_489_000n);
    expect(referenciaEscalada('8')).toBe(800_000_000n);
  });

  it('exige el formato \\d{1,6}(\\.\\d{1,8})?', () => {
    for (const malo of ['', '-7.6', '7,64', '1234567', '7.123456789', 'abc', '7.', '1e3']) {
      expect(referenciaEscalada(malo), malo).toBeUndefined();
    }
  });

  it('la banda del USD es de 5 a 15 con los extremos incluidos', () => {
    expect(dentroDeLaBanda('USD', referenciaEscalada('5')!)).toBe(true);
    expect(dentroDeLaBanda('USD', referenciaEscalada('15')!)).toBe(true);
    expect(dentroDeLaBanda('USD', referenciaEscalada('4.99999')!)).toBe(false);
    expect(dentroDeLaBanda('USD', referenciaEscalada('15.00001')!)).toBe(false);
    expect(dentroDeLaBanda('EUR', referenciaEscalada('0.5')!)).toBe(true);
  });
});

describe('variación máxima', () => {
  it('avisa solo si pasa del 3 %', () => {
    expect(variacionSuperaElLimite('7.00000', '7.21001')).toBe(true);
    expect(variacionSuperaElLimite('7.00000', '7.21000')).toBe(false);
    expect(variacionSuperaElLimite('7.00000', '6.78999')).toBe(true);
    expect(variacionSuperaElLimite('7.00000', '6.79000')).toBe(false);
    expect(variacionSuperaElLimite('7.64312', '7.64489')).toBe(false);
  });
});

describe('validarPublicacion', () => {
  it('acepta un valor correcto y lo pasa a ISO', () => {
    const resultado = validarPublicacion({ moneda: 'USD', fecha: '18/11/2026', referencia: '7.64489' }, HOY);
    expect(resultado).toEqual({
      valida: true,
      publicacion: { moneda: 'USD', fecha: '2026-11-18', referencia: '7.64489' },
    });
  });

  it('acepta mañana pero no pasado mañana', () => {
    expect(validarPublicacion({ moneda: 'USD', fecha: '19/11/2026', referencia: '7.6' }, HOY).valida).toBe(true);
    expect(validarPublicacion({ moneda: 'USD', fecha: '20/11/2026', referencia: '7.6' }, HOY)).toMatchObject({
      valida: false,
      motivo: 'dato_invalido',
    });
  });

  it('rechaza cero, formato malo y valores fuera de banda', () => {
    expect(validarPublicacion({ moneda: 'USD', fecha: '18/11/2026', referencia: '0' }, HOY)).toMatchObject({
      motivo: 'dato_invalido',
    });
    expect(validarPublicacion({ moneda: 'USD', fecha: '18/11/2026', referencia: 'x' }, HOY)).toMatchObject({
      motivo: 'dato_invalido',
    });
    expect(validarPublicacion({ moneda: 'USD', fecha: '18/11/2026', referencia: '76.4489' }, HOY)).toEqual({
      valida: false,
      motivo: 'valor_fuera_de_rango',
      fecha: '2026-11-18',
    });
  });
});

describe('relleno de huecos', () => {
  it('revisa los últimos 45 días contando hoy', () => {
    const rango = rangoDeRelleno(HOY);
    expect(rango.hasta).toBe(HOY);
    expect(fechasDelRango(rango.desde, rango.hasta)).toHaveLength(DIAS_DE_RELLENO);
  });

  it('lista las fechas sin publicación de la moneda', () => {
    const faltan = fechasSinPublicacion({ desde: '2026-11-16', hasta: '2026-11-18' }, 'USD', [
      { moneda: 'USD', fecha: '2026-11-16' },
      { moneda: 'EUR', fecha: '2026-11-17' },
    ]);
    expect(faltan).toEqual(['2026-11-17', '2026-11-18']);
  });
});
