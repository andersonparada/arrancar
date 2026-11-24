import { describe, expect, it } from 'vitest';
import { hallazgosDelCierre, type DatosParaHallazgos } from './hallazgos-del-cierre.js';
import { primerDiaDelMes, sumarMeses, ultimoDiaDelMes } from './meses.js';

const sinNada: DatosParaHallazgos = {
  cargaInicialAbierta: false,
  conSaldosIniciales: false,
  recepcionesDeDocumentosAnulados: { cantidad: 0, referencias: [] },
  lineasEnLaBandeja: 0,
  trasladosEnTransito: 0,
  lotesVencidos: 0,
};

describe('hallazgos del cierre', () => {
  it('un mes limpio no tiene hallazgos', () => {
    expect(hallazgosDelCierre(sinNada)).toEqual([]);
  });

  it('la carga inicial abierta solo bloquea si ya hay saldos iniciales', () => {
    expect(hallazgosDelCierre({ ...sinNada, cargaInicialAbierta: true })).toEqual([]);

    const hallazgos = hallazgosDelCierre({ ...sinNada, cargaInicialAbierta: true, conSaldosIniciales: true });

    expect(hallazgos.map((h) => [h.nivel, h.codigo])).toEqual([['bloquea', 'carga_inicial_abierta']]);
  });

  it('las recepciones de documentos anulados bloquean y dicen cuáles son', () => {
    const hallazgos = hallazgosDelCierre({
      ...sinNada,
      recepcionesDeDocumentosAnulados: { cantidad: 2, referencias: ['Recepción 3', 'Recepción 5'] },
    });

    expect(hallazgos).toEqual([
      expect.objectContaining({
        nivel: 'bloquea',
        codigo: 'recepciones_de_documentos_anulados',
        cantidad: 2,
        detalle: ['Recepción 3', 'Recepción 5'],
      }),
    ]);
  });

  it('bandeja, tránsito y lotes vencidos solo avisan, y los bloqueos van primero', () => {
    const hallazgos = hallazgosDelCierre({
      ...sinNada,
      lineasEnLaBandeja: 1,
      trasladosEnTransito: 2,
      lotesVencidos: 3,
      recepcionesDeDocumentosAnulados: { cantidad: 1, referencias: ['Recepción 1'] },
    });

    expect(hallazgos.map((h) => [h.nivel, h.codigo])).toEqual([
      ['bloquea', 'recepciones_de_documentos_anulados'],
      ['aviso', 'lineas_por_recibir'],
      ['aviso', 'traslados_en_transito'],
      ['aviso', 'lotes_vencidos'],
    ]);
    expect(hallazgos[2]!.mensaje).toContain('2 traslados van en tránsito');
  });
});

describe('meses', () => {
  it('el primer día del mes y el último', () => {
    expect(primerDiaDelMes('2026-06-17')).toBe('2026-06-01');
    expect(ultimoDiaDelMes('2026-06-01')).toBe('2026-06-30');
    expect(ultimoDiaDelMes('2028-02-01')).toBe('2028-02-29');
    expect(ultimoDiaDelMes('2026-12-01')).toBe('2026-12-31');
  });

  it('sumar meses cruza el año hacia los dos lados', () => {
    expect(sumarMeses('2026-12-01', 1)).toBe('2027-01-01');
    expect(sumarMeses('2026-01-01', -1)).toBe('2025-12-01');
  });
});
