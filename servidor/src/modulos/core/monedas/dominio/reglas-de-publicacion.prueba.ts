import { describe, expect, it } from 'vitest';
import { fechasDelRango, fechaDelBanguatAIso, fechaIsoAlBanguat } from './fechas-de-publicacion.js';
import { DIAS_DE_RELLENO, fechasSinPublicacion, rangoDeRelleno } from './huecos-de-publicacion.js';
import {
  cruceImplicito,
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

describe('variación para rechazar y cruce implícito', () => {
  it('rechaza solo si pasa del 25 %', () => {
    expect(variacionSuperaElRechazo('8.00', '10.00')).toBe(false);
    expect(variacionSuperaElRechazo('8.00', '10.00001')).toBe(true);
    expect(variacionSuperaElRechazo('8.00', '6.00')).toBe(false);
    expect(variacionSuperaElRechazo('8.00', '5.99999')).toBe(true);
  });

  it('el cruce implícito es el valor entre el USD, a 8 decimales', () => {
    expect(cruceImplicito('8.8', '8')).toBe('1.1');
    expect(cruceImplicito('1', '3')).toBe('0.33333333');
    expect(cruceImplicito('1', '0')).toBeUndefined();
    expect(cruceImplicito('x', '7.6')).toBeUndefined();
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
  const euro = { moneda: 'EUR', codigoBanguat: 28, fecha: '18/11/2026' };

  it('una moneda sin banda acepta cualquier valor positivo', () => {
    expect(validarPublicacion({ ...euro, referencia: '0.05' }, HOY).valida).toBe(true);
  });

  it('con compra igual a venta guarda las tres, normalizadas', () => {
    expect(validarPublicacion({ ...euro, referencia: '8.80', compra: '8.8E0', venta: '8.80' }, HOY)).toEqual({
      valida: true,
      publicacion: { ...euro, fecha: '2026-11-18', referencia: '8.8', compra: '8.8', venta: '8.8' },
    });
  });

  it('con compra distinta de venta es valor ambiguo', () => {
    expect(validarPublicacion({ ...euro, referencia: '8.82', compra: '8.81', venta: '8.82' }, HOY)).toEqual({
      valida: false,
      motivo: 'valor_ambiguo',
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
