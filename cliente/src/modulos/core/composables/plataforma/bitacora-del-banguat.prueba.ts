import { describe, expect, it } from 'vitest';
import type { ConsultaDeLaCarga } from '../../servicios/tipos-de-cambio.api';
import {
  lineasDelDetalle,
  nombreDeLaVuelta,
  quehacerConElResultado,
  resultadoDeLaConsulta,
  resumenDeLaConsulta,
} from './bitacora-del-banguat';

const alReves = (fecha: string) => fecha.split('-').reverse().join('/');

const consulta = (extra: Partial<ConsultaDeLaCarga>): ConsultaDeLaCarga => ({
  id: '1',
  iniciadaEn: '2026-11-18T12:00:00Z',
  terminadaEn: '2026-11-18T12:00:01Z',
  operacion: 'TipoCambioRangoMoneda',
  vuelta: 'manana',
  moneda: 'EUR',
  codigoBanguat: 28,
  desde: '2026-11-12',
  hasta: '2026-11-18',
  resultado: 'exito',
  filasNuevas: 5,
  filasRechazadas: 0,
  detalle: null,
  aPedido: false,
  ...extra,
});

describe('la bitácora de la carga', () => {
  it('nombra cada vuelta y cada resultado', () => {
    expect(nombreDeLaVuelta('noche')).toBe('Noche (adelanta mañana)');
    expect(resultadoDeLaConsulta('exito')).toEqual({ texto: 'Correcto', tono: 'campo' });
    expect(resultadoDeLaConsulta('variacion_excesiva').tono).toBe('rojo');
  });

  it('todo resultado que no es éxito dice qué hacer', () => {
    expect(quehacerConElResultado('exito')).toBeNull();
    for (const resultado of [
      'error',
      'sin_datos',
      'valor_fuera_de_rango',
      'valor_ambiguo',
      'variacion_excesiva',
    ] as const)
      expect(quehacerConElResultado(resultado)).toBeTruthy();
  });

  it('el detalle sale línea por línea, con los rechazos en palabras y las fechas con el formato de la empresa', () => {
    const detalle = 'EUR 2026-11-17: variacion_excesiva | EUR 2026-11-18: cambió más de 3 % (de 8.8 a 9.2).';

    expect(lineasDelDetalle(detalle, alReves)).toEqual([
      'EUR 17/11/2026: cambió más de 25 % y no se guardó',
      'EUR 18/11/2026: cambió más de 3 % (de 8.8 a 9.2).',
    ]);
    expect(lineasDelDetalle(null, alReves)).toEqual([]);
  });

  it('resume qué se pidió: moneda y una fecha o un rango', () => {
    expect(resumenDeLaConsulta(consulta({}), alReves)).toBe('EUR · 12/11/2026 al 18/11/2026');
    expect(resumenDeLaConsulta(consulta({ desde: '2026-11-18', hasta: '2026-11-18' }), alReves)).toBe(
      'EUR · 18/11/2026',
    );
    expect(
      resumenDeLaConsulta(
        consulta({ moneda: null, operacion: 'VariablesDisponibles', desde: null, hasta: null }),
        alReves,
      ),
    ).toBe('Lista');
  });
});
