import { describe, expect, it } from 'vitest';
import type { ConsultaDeLaCarga, EstadoDeLaCarga } from '../../servicios/tipos-de-cambio.api';
import {
  consultasDeLaCarga,
  esperarElFinDeLaCarga,
  resultadoDeLaLista,
  resumenesDeLaCarga,
} from './seguimiento-de-la-carga';

const consulta = (extra: Partial<ConsultaDeLaCarga>): ConsultaDeLaCarga => ({
  id: '1',
  iniciadaEn: '2026-11-19T10:00:05.000Z',
  terminadaEn: '2026-11-19T10:00:09.000Z',
  operacion: 'TipoCambioRangoMoneda',
  vuelta: 'manual',
  moneda: 'USD',
  codigoBanguat: 2,
  desde: '2026-11-19',
  hasta: '2026-11-19',
  resultado: 'exito',
  filasNuevas: 1,
  filasRechazadas: 0,
  detalle: null,
  aPedido: true,
  ...extra,
});

const estado = (enCurso: boolean): EstadoDeLaCarga => ({ hoy: '2026-11-19', enCurso, series: [], consultas: [] });
const INICIO = '2026-11-19T10:00:00.000Z';

describe('esperarElFinDeLaCarga', () => {
  it('pregunta hasta que ninguna carga corra y devuelve ese estado', async () => {
    const respuestas = [estado(true), estado(true), estado(false)];
    const esperas: number[] = [];

    const final = await esperarElFinDeLaCarga({
      pedirEstado: async () => respuestas.shift() ?? estado(false),
      esperar: async (ms) => void esperas.push(ms),
    });

    expect(final.enCurso).toBe(false);
    expect(esperas).toEqual([2000, 2000, 2000]);
  });

  it('se rinde si la carga no termina en 10 minutos', async () => {
    await expect(
      esperarElFinDeLaCarga({ pedirEstado: async () => estado(true), esperar: async () => {} }),
    ).rejects.toThrow('sigue corriendo');
  });
});

describe('lo que dejó la carga en la bitácora', () => {
  it('solo cuenta lo pedido por una persona, de esa vuelta y desde que arrancó', () => {
    const consultas = [
      consulta({ id: 'a', moneda: 'EUR', iniciadaEn: '2026-11-19T10:00:07.000Z' }),
      consulta({ id: 'b' }),
      consulta({ id: 'c', aPedido: false }),
      consulta({ id: 'd', vuelta: 'noche' }),
      consulta({ id: 'e', iniciadaEn: '2026-11-19T09:59:00.000Z' }),
    ];

    expect(consultasDeLaCarga(consultas, 'manual', INICIO).map((c) => c.id)).toEqual(['b', 'a']);
    expect(resumenesDeLaCarga(consultas, INICIO).map((r) => r.moneda)).toEqual(['USD', 'EUR']);
  });

  it('la lista del Banguat sale de su fila: nuevas y resultado', () => {
    const consultas = [consulta({ vuelta: 'lista', moneda: null, filasNuevas: 3, resultado: 'exito' })];

    expect(resultadoDeLaLista(consultas, INICIO)).toMatchObject({ resultado: 'exito', nuevas: 3, noDisponibles: 0 });
    expect(resultadoDeLaLista([], INICIO)).toBeNull();
  });
});
