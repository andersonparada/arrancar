import { describe, expect, it } from 'vitest';
import { armarCasos } from './casos-de-votacion.js';
import type { CasoVotante, ConceptoOfrecible, Ejemplo, Pendiente } from './tipos.js';
import { votar } from './votacion.js';

const PLANILLA: ConceptoOfrecible = { id: 'planilla', nombre: 'Planilla' };
const COMISIONES: ConceptoOfrecible = { id: 'comisiones', nombre: 'Comisiones' };
const PARAMETROS = { confianzaMinima: 60 };

const caso = (conceptoId: string, cambios: Partial<CasoVotante> = {}): CasoVotante => ({
  conceptoId,
  fecha: '2026-03-01',
  montoEnCentavos: 100_000,
  peso: 1,
  distanciaEnDias: 0,
  base: 'mismo_beneficiario',
  ...cambios,
});

const pendiente = (cambios: Partial<Pendiente> = {}): Pendiente => ({
  id: 'x',
  fecha: '2026-04-01',
  montoEnCentavos: 100_000,
  direccion: 'salida',
  cuentaBancariaId: 'cuenta',
  beneficiarioParaComparar: 'ferreteria',
  textoParaComparar: null,
  ...cambios,
});

const ejemplo = (id: string, cambios: Partial<Ejemplo> = {}): Ejemplo => ({
  fecha: '2026-03-15',
  montoEnCentavos: 100_000,
  direccion: 'salida',
  cuentaBancariaId: 'cuenta',
  beneficiarioParaComparar: 'ferreteria',
  textoParaComparar: null,
  id,
  conceptoId: 'planilla',
  ...cambios,
});

describe('votar', () => {
  it('sin casos no hay nada que sugerir', () => {
    expect(votar([], [PLANILLA], PARAMETROS)).toEqual({ sugerido: null, alternativas: [], casosComparados: 0 });
  });

  it('con uno, dos y cuatro casos idénticos la confianza es 50, 67 y 80 %', () => {
    const con = (n: number) => votar(Array(n).fill(caso('planilla')), [PLANILLA], PARAMETROS);
    expect(con(1).sugerido).toBeNull();
    expect(con(1).alternativas[0]?.confianza).toBe(50);
    expect(con(2).sugerido?.confianza).toBe(67);
    expect(con(4).sugerido?.confianza).toBe(80);
  });

  it('el porqué resume casos, último caso y rango de montos', () => {
    const casos = [
      caso('planilla', { montoEnCentavos: 15_000, fecha: '2026-02-01', distanciaEnDias: 60 }),
      caso('planilla', { montoEnCentavos: 120_000, fecha: '2026-03-12', distanciaEnDias: 20 }),
    ];
    expect(votar(casos, [PLANILLA], PARAMETROS).sugerido?.porque).toEqual({
      base: 'mismo_beneficiario',
      casos: 2,
      ultimaFecha: '2026-03-12',
      montoMinimo: '150.00',
      montoMaximo: '1200.00',
      beneficiarioParecido: null,
    });
  });

  it('un concepto que no se puede ofrecer resta confianza a los demás y no aparece', () => {
    const casos = [...Array(2).fill(caso('planilla')), ...Array(8).fill(caso('inactivo'))];
    const resultado = votar(casos, [PLANILLA], PARAMETROS);
    expect(resultado.sugerido).toBeNull();
    expect(resultado.alternativas.map((o) => o.conceptoId)).toEqual(['planilla']);
    expect(resultado.alternativas[0]?.confianza).toBe(18);
    expect(resultado.casosComparados).toBe(10);
  });

  it('las alternativas necesitan 10 %, con sugerido son hasta 2 y sin sugerido hasta 3', () => {
    const casos = [...Array(6).fill(caso('planilla')), ...Array(2).fill(caso('comisiones'))];
    const resultado = votar(casos, [PLANILLA, COMISIONES], PARAMETROS);
    expect(resultado.sugerido?.conceptoId).toBe('planilla');
    expect(resultado.alternativas.map((o) => o.conceptoId)).toEqual(['comisiones']);
    const varios = ['a', 'b', 'c', 'd'].map((id) => ({ id, nombre: id }));
    const parejos = votar(
      varios.flatMap((c) => Array(2).fill(caso(c.id))),
      varios,
      PARAMETROS,
    );
    expect(parejos.sugerido).toBeNull();
    expect(parejos.alternativas).toHaveLength(3);
  });

  it('desempata por el caso más cercano y luego por el nombre', () => {
    const cercano = votar(
      [caso('comisiones', { distanciaEnDias: 1 }), caso('planilla', { distanciaEnDias: 5 })],
      [PLANILLA, COMISIONES],
      PARAMETROS,
    );
    expect(cercano.alternativas.map((o) => o.conceptoId)).toEqual(['comisiones', 'planilla']);
    const porNombre = votar([caso('planilla'), caso('comisiones')], [PLANILLA, COMISIONES], PARAMETROS);
    expect(porNombre.alternativas.map((o) => o.conceptoId)).toEqual(['comisiones', 'planilla']);
  });

  it('la confianza mínima cambia si hay sugerido', () => {
    const casos = [caso('planilla'), caso('planilla')];
    expect(votar(casos, [PLANILLA], { confianzaMinima: 70 }).sugerido).toBeNull();
    expect(votar(casos, [PLANILLA], { confianzaMinima: 50 }).sugerido?.conceptoId).toBe('planilla');
  });
});

describe('armarCasos', () => {
  it('con beneficiario solo cuenta el mismo, de la misma dirección y distinto del pendiente', () => {
    const casos = armarCasos(
      pendiente(),
      [
        ejemplo('a'),
        ejemplo('b', { direccion: 'entrada' }),
        ejemplo('c', { beneficiarioParaComparar: 'otro' }),
        ejemplo('x'),
      ],
      180,
    );
    expect(casos).toHaveLength(1);
    expect(casos[0]).toMatchObject({ base: 'mismo_beneficiario', distanciaEnDias: 17 });
  });

  it('sin beneficiario cuentan los que tampoco lo tienen y son de la misma cuenta; el texto sube el peso', () => {
    const sin = pendiente({ beneficiarioParaComparar: null, textoParaComparar: 'comision mensual' });
    const casos = armarCasos(
      sin,
      [
        ejemplo('a', { beneficiarioParaComparar: null, textoParaComparar: 'comision mensual' }),
        ejemplo('b', { beneficiarioParaComparar: null, textoParaComparar: null }),
        ejemplo('c', { beneficiarioParaComparar: null, cuentaBancariaId: 'otra' }),
        ejemplo('d'),
      ],
      180,
    );
    expect(casos.map((c) => c.base)).toEqual(['misma_cuenta_sin_beneficiario', 'misma_cuenta_sin_beneficiario']);
    expect(casos[0]!.peso).toBeGreaterThan(casos[1]!.peso);
  });

  it('descarta lo que queda fuera de 4 vidas medias y limita a los 300 más cercanos', () => {
    expect(armarCasos(pendiente(), [ejemplo('lejos', { fecha: '2024-01-01' })], 180)).toEqual([]);
    const muchos = Array.from({ length: 350 }, (_, i) => ejemplo(`e${i}`));
    expect(armarCasos(pendiente(), muchos, 180)).toHaveLength(300);
  });
});
