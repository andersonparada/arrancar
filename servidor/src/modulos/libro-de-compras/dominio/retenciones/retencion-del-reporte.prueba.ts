import { describe, expect, it } from 'vitest';
import { claveDelGrupo } from './grupo-de-entero.js';
import {
  pagadoDe,
  resumirPorGrupo,
  retenidoPorGrupo,
  tieneEnteroVigente,
  type EnteroGuardado,
  type RetencionDelReporte,
} from './retencion-del-reporte.js';

const retencion = (cambios: Partial<RetencionDelReporte> & { anulado?: boolean } = {}): RetencionDelReporte => {
  const { anulado, ...resto } = cambios;
  return {
    id: crypto.randomUUID(),
    impuesto: 'iva',
    regla: 'iva_contribuyente_especial',
    base: 10000,
    porcentaje: 1500,
    montoPropuesto: 1500,
    monto: 1500,
    motivoDelAjuste: null,
    fecha: '2026-09-10',
    constancia: null,
    resolucion: null,
    notaDeResolucion: null,
    resueltaEn: null,
    resueltaPor: null,
    documento: {
      id: crypto.randomUUID(),
      estado: anulado ? 'anulado' : 'vigente',
      tipoDte: 'FACT',
      serie: 'A',
      numero: '1',
      autorizacionFel: null,
      fechaEmision: '2026-09-09',
      motivoDeAnulacion: null,
    },
    proveedor: { id: crypto.randomUUID(), nit: '1234567', nombre: 'Proveedor' },
    ...resto,
  };
};

const pago = (cambios: Partial<EnteroGuardado> = {}): EnteroGuardado => ({
  id: crypto.randomUUID(),
  mes: '2026-09-01',
  grupo: 'iva_agentes',
  fechaDePago: '2026-10-15',
  documentoDePago: 'F1',
  monto: 3000,
  retenidoAlMarcar: 3000,
  observaciones: null,
  estado: 'vigente',
  anuladoEn: null,
  motivoDeAnulacion: null,
  registradoPor: null,
  ...cambios,
});

describe('resumen de lo retenido por mes y grupo', () => {
  it('suma por regla y por constancia solo lo vigente y mayor que cero', () => {
    const resumenes = resumirPorGrupo([
      retencion(),
      retencion({ constancia: { numero: 'C1', fecha: '2026-09-20' } }),
      retencion({ monto: 0 }),
      retencion({ anulado: true }),
      retencion({ regla: 'iva_pequeno_contribuyente', monto: 500 }),
    ]);

    const grupo = resumenes.get(claveDelGrupo('2026-09-01', 'iva_agentes'))!;
    expect(grupo.retenido).toBe(3500);
    expect(grupo.conConstancia).toEqual({ cantidad: 1, monto: 1500 });
    expect(grupo.sinConstancia).toEqual({ cantidad: 2, monto: 2000 });
    expect(grupo.reglas.map((regla) => [regla.regla, regla.cantidad, regla.retenido])).toEqual([
      ['iva_contribuyente_especial', 2, 3000],
      ['iva_pequeno_contribuyente', 1, 500],
    ]);
  });

  it('separa los meses y los grupos', () => {
    const resumenes = resumirPorGrupo([
      retencion({ fecha: '2026-09-30' }),
      retencion({ fecha: '2026-10-01' }),
      retencion({ impuesto: 'isr', regla: 'isr_opcional_simplificado', porcentaje: null }),
    ]);

    expect([...resumenes.keys()].sort()).toEqual([
      '2026-09-01|isr_opcional',
      '2026-09-01|iva_agentes',
      '2026-10-01|iva_agentes',
    ]);
  });

  it('retenido por grupo suma las reglas del mismo grupo', () => {
    const sumas = retenidoPorGrupo([
      { mes: '2026-09-01', regla: 'iva_exportador', monto: 100 },
      { mes: '2026-09-01', regla: 'iva_otro_agente', monto: 200 },
      { mes: '2026-09-01', regla: 'iva_factura_especial', monto: 50 },
    ]);
    expect(sumas.get(claveDelGrupo('2026-09-01', 'iva_agentes'))).toBe(300);
    expect(sumas.get(claveDelGrupo('2026-09-01', 'iva_factura_especial'))).toBe(50);
  });
});

describe('pagos de un mes y grupo', () => {
  it('suma solo los vigentes y sabe si hay alguno', () => {
    const pagos = [pago(), pago({ monto: 500 }), pago({ estado: 'anulado', monto: 9999 })];

    expect(pagadoDe(pagos, '2026-09-01', 'iva_agentes')).toBe(3500);
    expect(pagadoDe(pagos, '2026-09-01', 'isr_opcional')).toBe(0);
    expect(tieneEnteroVigente(pagos, '2026-09-01', 'iva_agentes')).toBe(true);
    expect(tieneEnteroVigente([pago({ estado: 'anulado' })], '2026-09-01', 'iva_agentes')).toBe(false);
  });
});
