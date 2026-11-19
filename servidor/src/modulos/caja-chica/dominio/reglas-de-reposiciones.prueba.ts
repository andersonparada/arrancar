import { describe, expect, it } from 'vitest';
import type { Comprobante } from './comprobantes.js';
import {
  AVISO_DE_SEPARACION_DE_FUNCIONES,
  exigirComprobantesPorReponer,
  exigirFechaDeLaReposicion,
  exigirReposicionAnulable,
  exigirReposicionConMonto,
  exigirReposicionSinCobrar,
  revisarLaSeparacionDeFunciones,
} from './reglas-de-reposiciones.js';

const FONDO = 'fondo-1';
const comprobante = (cambios: Partial<Comprobante> = {}) =>
  ({
    id: 'c1',
    fondoId: FONDO,
    estado: 'vigente',
    reposicionNumero: null,
    fecha: '2026-11-10',
    ...cambios,
  }) as Comprobante;

describe('exigirComprobantesPorReponer', () => {
  it('acepta los vigentes del fondo que no están repuestos, aunque el id se repita', () => {
    expect(() => exigirComprobantesPorReponer(['c1', 'c1'], [comprobante()], FONDO)).not.toThrow();
  });

  it('rechaza una lista vacía', () => {
    expect(() => exigirComprobantesPorReponer([], [], FONDO)).toThrowError(
      expect.objectContaining({ codigo: 'reposicion_sin_comprobantes' }),
    );
  });

  it('rechaza el que no se ve o es de otro fondo', () => {
    const rechazo = expect.objectContaining({ codigo: 'comprobante_no_es_del_fondo' });

    expect(() => exigirComprobantesPorReponer(['c1', 'c2'], [comprobante()], FONDO)).toThrowError(rechazo);
    expect(() => exigirComprobantesPorReponer(['c1'], [comprobante({ fondoId: 'otro' })], FONDO)).toThrowError(rechazo);
  });

  it('rechaza el anulado y el que ya está en otra reposición', () => {
    expect(() => exigirComprobantesPorReponer(['c1'], [comprobante({ estado: 'anulado' })], FONDO)).toThrowError(
      expect.objectContaining({ codigo: 'comprobante_ya_anulado' }),
    );
    expect(() => exigirComprobantesPorReponer(['c1'], [comprobante({ reposicionNumero: 4 })], FONDO)).toThrowError(
      expect.objectContaining({ codigo: 'comprobante_repuesto', message: 'Está en la reposición 4: anúlela primero.' }),
    );
  });
});

describe('exigirReposicionConMonto', () => {
  it('pide un total mayor que cero', () => {
    expect(exigirReposicionConMonto(100)).toBe(100);
    expect(() => exigirReposicionConMonto(0)).toThrowError(expect.objectContaining({ codigo: 'reposicion_sin_monto' }));
    expect(() => exigirReposicionConMonto(-500)).toThrowError(
      expect.objectContaining({ codigo: 'reposicion_sin_monto' }),
    );
  });
});

describe('exigirFechaDeLaReposicion', () => {
  const contexto = {
    hoy: '2026-11-18',
    fondo: { fechaDeApertura: '2026-11-01' },
    comprobantes: [{ fecha: '2026-11-10' }],
  };

  it('acepta desde el último comprobante hasta hoy', () => {
    expect(() => exigirFechaDeLaReposicion('2026-11-10', contexto)).not.toThrow();
    expect(() => exigirFechaDeLaReposicion('2026-11-18', contexto)).not.toThrow();
  });

  it('rechaza una fecha futura, anterior a la apertura o anterior a un comprobante', () => {
    const rechazo = expect.objectContaining({ codigo: 'fecha_de_la_reposicion_invalida' });

    expect(() => exigirFechaDeLaReposicion('2026-11-19', contexto)).toThrowError(rechazo);
    expect(() => exigirFechaDeLaReposicion('2026-10-31', contexto)).toThrowError(rechazo);
    expect(() => exigirFechaDeLaReposicion('2026-11-05', contexto)).toThrowError(rechazo);
  });
});

describe('revisarLaSeparacionDeFunciones', () => {
  it('no dice nada si quien repone no es el custodio', () => {
    expect(revisarLaSeparacionDeFunciones(false, 'bloquear')).toBeNull();
  });

  it('avisa o bloquea al custodio según la configuración', () => {
    expect(revisarLaSeparacionDeFunciones(true, 'avisar')).toBe(AVISO_DE_SEPARACION_DE_FUNCIONES);
    expect(() => revisarLaSeparacionDeFunciones(true, 'bloquear')).toThrowError(
      expect.objectContaining({ codigo: 'separacion_de_funciones' }),
    );
  });
});

describe('anular una reposición', () => {
  it('no se anula la ya anulada ni la del cierre', () => {
    const vigente = { estado: 'vigente', forma: 'cheque', numero: 3 } as const;

    expect(() => exigirReposicionAnulable(vigente)).not.toThrow();
    expect(() => exigirReposicionAnulable({ ...vigente, estado: 'anulada' })).toThrowError(
      expect.objectContaining({ codigo: 'reposicion_ya_anulada' }),
    );
    expect(() => exigirReposicionAnulable({ ...vigente, forma: 'compensada_al_cerrar' })).toThrowError(
      expect.objectContaining({ codigo: 'reposicion_del_cierre' }),
    );
  });

  it('no se anula si el banco ya pagó el cheque', () => {
    expect(() => exigirReposicionSinCobrar({ numero: 3 }, false)).not.toThrow();
    expect(() => exigirReposicionSinCobrar({ numero: 3 }, true)).toThrowError(
      expect.objectContaining({
        codigo: 'reposicion_cobrada',
        message: 'El banco ya pagó el cheque de la reposición 3.',
      }),
    );
  });
});
