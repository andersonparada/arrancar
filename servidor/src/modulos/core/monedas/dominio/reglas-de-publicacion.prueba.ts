import { describe, expect, it } from 'vitest';
import { CODIGOS_DEL_BANGUAT_EXCLUIDOS } from './codigos-del-banguat-excluidos.js';
import { fechasDelRango, fechaDelBanguatAIso, fechaIsoAlBanguat } from './fechas-de-publicacion.js';
import { DIAS_DE_RELLENO, fechasSinPublicacion, rangoDeRelleno } from './huecos-de-publicacion.js';
import {
  dentroDeLaBanda,
  referenciaEscalada,
  validarPublicacion,
  variacionSuperaElLimite,
  variacionSuperaElRechazo,
} from './reglas-de-publicacion.js';
import { textoDeEscalado } from './valores-decimales.js';

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

  it('rechaza lo que no es un decimal positivo de hasta 6 enteros', () => {
    for (const malo of ['', '-7.6', '7,64', '1234567', 'abc', '7.', '1e', '1e100', ' 7.6', '7.6'.padEnd(40, '0')]) {
      expect(referenciaEscalada(malo), malo).toBeUndefined();
    }
  });

  it('acepta notación científica sin pasar por number', () => {
    expect(referenciaEscalada('5.1E-05')).toBe(5_100n);
    expect(referenciaEscalada('8.8E0')).toBe(880_000_000n);
    expect(referenciaEscalada('1e+2')).toBe(10_000_000_000n);
  });

  it('con más de 8 decimales redondea desde la mitad hacia arriba', () => {
    expect(referenciaEscalada('8.812345674')).toBe(881_234_567n);
    expect(referenciaEscalada('8.812345675')).toBe(881_234_568n);
    expect(referenciaEscalada('0.000000004999')).toBe(0n);
  });

  it('rechaza lo que pasa de 99999999.99999999 y escribe el texto sin ceros sobrantes', () => {
    expect(referenciaEscalada('999999e3')).toBeUndefined();
    expect(referenciaEscalada('999999.99e1')).toBe(999_999_990_000_000n);
    expect(textoDeEscalado(764_489_000n)).toBe('7.64489');
    expect(textoDeEscalado(5_100n)).toBe('0.000051');
    expect(textoDeEscalado(800_000_000n)).toBe('8');
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

describe('variación para rechazar', () => {
  it('rechaza solo si pasa del 25 %', () => {
    expect(variacionSuperaElRechazo('8.00', '10.00')).toBe(false);
    expect(variacionSuperaElRechazo('8.00', '10.00001')).toBe(true);
    expect(variacionSuperaElRechazo('8.00', '6.00')).toBe(false);
    expect(variacionSuperaElRechazo('8.00', '5.99999')).toBe(true);
  });
});

describe('validarPublicacion', () => {
  it('acepta un valor correcto y lo pasa a ISO', () => {
    const resultado = validarPublicacion(
      { moneda: 'USD', codigoBanguat: 2, fecha: '18/11/2026', referencia: '7.64489' },
      HOY,
    );
    expect(resultado).toEqual({
      valida: true,
      publicacion: { moneda: 'USD', codigoBanguat: 2, fecha: '2026-11-18', referencia: '7.64489' },
    });
  });

  it('acepta mañana pero no pasado mañana', () => {
    expect(
      validarPublicacion({ moneda: 'USD', codigoBanguat: 2, fecha: '19/11/2026', referencia: '7.6' }, HOY).valida,
    ).toBe(true);
    expect(
      validarPublicacion({ moneda: 'USD', codigoBanguat: 2, fecha: '20/11/2026', referencia: '7.6' }, HOY),
    ).toMatchObject({
      valida: false,
      motivo: 'dato_invalido',
    });
  });

  it('rechaza cero, formato malo y valores fuera de banda', () => {
    expect(
      validarPublicacion({ moneda: 'USD', codigoBanguat: 2, fecha: '18/11/2026', referencia: '0' }, HOY),
    ).toMatchObject({
      motivo: 'dato_invalido',
    });
    expect(
      validarPublicacion({ moneda: 'USD', codigoBanguat: 2, fecha: '18/11/2026', referencia: 'x' }, HOY),
    ).toMatchObject({
      motivo: 'dato_invalido',
    });
    expect(
      validarPublicacion({ moneda: 'USD', codigoBanguat: 2, fecha: '18/11/2026', referencia: '76.4489' }, HOY),
    ).toEqual({
      valida: false,
      motivo: 'valor_fuera_de_rango',
      fecha: '2026-11-18',
    });
  });
});

describe('valores de otras monedas', () => {
  const euro = { moneda: 'EUR', codigoBanguat: 24, fecha: '18/11/2026' };

  it('una moneda sin banda acepta cualquier valor positivo', () => {
    expect(validarPublicacion({ ...euro, referencia: '0.05' }, HOY).valida).toBe(true);
  });

  it('con compra igual a venta guarda las tres, normalizadas', () => {
    expect(validarPublicacion({ ...euro, compra: '1.1257', venta: '1.12570' }, HOY)).toEqual({
      valida: true,
      publicacion: { ...euro, fecha: '2026-11-18', referencia: '1.1257', compra: '1.1257', venta: '1.1257' },
    });
  });

  it('con compra distinta de venta toma el promedio de lo publicado, con un decimal más si hace falta', () => {
    expect(validarPublicacion({ ...euro, compra: '1.1256', venta: '1.1257' }, HOY)).toEqual({
      valida: true,
      publicacion: { ...euro, fecha: '2026-11-18', referencia: '1.12565', compra: '1.1256', venta: '1.1257' },
    });
  });

  it('el diferencial de 3 % exacto pasa y el de 3.01 % es valor ambiguo', () => {
    expect(validarPublicacion({ ...euro, compra: '98.5', venta: '101.5' }, HOY).valida).toBe(true);
    expect(validarPublicacion({ ...euro, compra: '100', venta: '103.06' }, HOY)).toEqual({
      valida: false,
      motivo: 'valor_ambiguo',
      fecha: '2026-11-18',
    });
  });

  it('venta menor que compra, o compra en cero o ilegible, es dato inválido', () => {
    for (const [compra, venta] of [
      ['1.1257', '1.1256'],
      ['0', '1'],
      ['x', '1.1'],
      ['1.1', ''],
    ] as const) {
      expect(validarPublicacion({ ...euro, compra, venta }, HOY), `${compra}/${venta}`).toMatchObject({
        valida: false,
        motivo: 'dato_invalido',
      });
    }
  });

  it('el dólar con compra distinta de venta sigue siendo ambiguo: tiene una sola referencia', () => {
    const dolar = { moneda: 'USD', codigoBanguat: 2, fecha: '18/11/2026' };
    expect(validarPublicacion({ ...dolar, compra: '7.60', venta: '7.65' }, HOY)).toMatchObject({
      motivo: 'valor_ambiguo',
    });
    expect(validarPublicacion({ ...dolar, compra: '7.64489', venta: '7.64489' }, HOY)).toMatchObject({
      valida: true,
      publicacion: { referencia: '7.64489' },
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
    const faltan = fechasSinPublicacion({
      rango: { desde: '2026-11-16', hasta: '2026-11-18' },
      moneda: 'USD',
      conocidas: [
        { moneda: 'USD', fecha: '2026-11-16' },
        { moneda: 'EUR', fecha: '2026-11-17' },
      ],
    });
    expect(faltan).toEqual(['2026-11-17', '2026-11-18']);
  });

  it('para otras monedas solo cuenta los días esperados', () => {
    const faltan = fechasSinPublicacion({
      rango: { desde: '2026-11-13', hasta: '2026-11-17' },
      moneda: 'EUR',
      conocidas: [],
      diasEsperados: new Set(['2026-11-13', '2026-11-16', '2026-11-17']),
    });
    expect(faltan).toEqual(['2026-11-13', '2026-11-16', '2026-11-17']);
  });
});

describe('códigos del Banguat excluidos', () => {
  it('son los 15 de la adenda B.8: el euro (24), el dólar (2) y la libra (9) no están', () => {
    expect([...CODIGOS_DEL_BANGUAT_EXCLUIDOS]).toEqual([1, 4, 6, 8, 11, 12, 13, 14, 17, 22, 26, 27, 28, 37, 41]);
    for (const ofrecido of [2, 9, 24, 42]) expect(CODIGOS_DEL_BANGUAT_EXCLUIDOS.has(ofrecido)).toBe(false);
  });
});
