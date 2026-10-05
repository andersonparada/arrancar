import { describe, expect, it } from 'vitest';
import {
  AVISO_DE_RETENCION_QUITADA,
  AVISO_DE_RETENCION_QUITADA_SIN_ISR,
  avisosDeRetenciones,
} from './avisos-de-retenciones.js';
import { CalendarioDeLunesAViernes } from './calendario-laboral.js';
import { calcularDocumento, type DatosParaCalcular } from './calculo-de-documento.js';
import { DatosFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import type { RetencionDeDocumento } from './documento-de-compra.js';
import {
  AVISO_DE_CONSUMIDOR_FINAL_GRANDE_SIN_ISR,
  AVISO_FACTURA_ESPECIAL,
  AVISO_NO_DEDUCIBLE_SIN_ISR,
  avisosDeConsumidorFinal,
  evaluarFueraDelLibro,
} from './fuera-del-libro.js';
import { AVISO_NOTA_CON_CAMBIO_DE_REGIMEN, determinarMotivoSinCredito } from './motivo-sin-credito.js';
import { AVISO_DE_ANIO_ANTERIOR_SIN_ISR, AVISO_DE_PERIODO_PASADO } from './periodo-del-libro.js';

const factura = (cambios: Partial<DatosParaCalcular> = {}): DatosParaCalcular => ({
  tipo: 'factura',
  muestraEnReportesSat: true,
  noVinculado: false,
  empresaConCreditoFiscal: false,
  empresaConIsrSobreUtilidades: true,
  fechaDeEmision: '2026-01-15',
  fechaDeRecepcion: '2026-01-20',
  periodo: '2026-01-01',
  lineas: [{ total: 11200, exento: 0 }],
  tasaDeIva: 1200,
  mesActual: '2026-01-01',
  ...cambios,
});

const nota = (cambios: Partial<DatosParaCalcular> = {}): DatosParaCalcular =>
  factura({
    tipo: 'nota_de_credito',
    fechaDeEmision: '2026-05-02',
    fechaDeRecepcion: '2026-05-10',
    periodo: '2026-05-01',
    ...cambios,
  });

describe('empresa sin crédito fiscal (pequeño contribuyente) con una factura general', () => {
  it('el IVA se calcula y va al costo de cada línea', () => {
    const documento = calcularDocumento(factura());

    expect(documento.motivoSinCredito).toBe('empresa_sin_credito');
    expect(documento.totales.iva).toBe(1200);
    expect(documento.totales.ivaNoAcreditable).toBe(1200);
    expect(documento.lineas.map((linea) => linea.ivaNoAcreditable)).toEqual(documento.lineas.map((linea) => linea.iva));
  });

  it('no evalúa no vinculado ni el plazo del art. 20, y no avisa de plazo ni de rectificar', () => {
    const documento = calcularDocumento(
      factura({ noVinculado: true, periodo: '2026-09-01', fechaDeRecepcion: '2026-09-02', mesActual: '2026-10-01' }),
    );

    expect(documento.motivoSinCredito).toBe('empresa_sin_credito');
    expect(documento.avisos).toEqual([]);
  });

  it('con crédito, el mismo documento sí avisa que hay que rectificar', () => {
    const documento = calcularDocumento(factura({ empresaConCreditoFiscal: true, mesActual: '2026-02-01' }));

    expect(documento.avisos).toEqual([AVISO_DE_PERIODO_PASADO]);
  });
});

describe('nota de crédito con cambio de régimen', () => {
  it('si la factura dio crédito y la empresa ya no lo tiene, lleva empresa_sin_credito y avisa', () => {
    const documento = calcularDocumento(nota({ motivoDeLaFactura: null }));

    expect(documento.motivoSinCredito).toBe('empresa_sin_credito');
    expect(documento.avisos).toEqual([AVISO_NOTA_CON_CAMBIO_DE_REGIMEN]);
    expect(documento.avisos[0]).toBe('La factura dio crédito en el régimen anterior; consulte a su contador.');
    expect(documento.totales.ivaNoAcreditable).toBe(documento.totales.iva);
  });

  it('si la factura ya tenía un motivo, la nota lo hereda tal cual', () => {
    for (const motivo of ['fuera_de_plazo', 'no_vinculado', 'empresa_sin_credito'] as const) {
      const documento = calcularDocumento(nota({ motivoDeLaFactura: motivo }));
      expect(documento.motivoSinCredito).toBe(motivo);
      expect(documento.avisos).toEqual([]);
    }
  });

  it('con crédito la nota de una factura con crédito no lleva motivo ni aviso', () => {
    const documento = calcularDocumento(nota({ empresaConCreditoFiscal: true, motivoDeLaFactura: null }));

    expect(documento.motivoSinCredito).toBeNull();
    expect(documento.avisos).toEqual([]);
  });
});

describe('determinarMotivoSinCredito: empresa_sin_credito y los demás motivos no se mezclan', () => {
  const base = {
    tipo: 'factura' as const,
    muestraEnReportesSat: true,
    noVinculado: true,
    empresaConCreditoFiscal: false,
    total: 5000,
    exento: 0,
    iva: 535,
    periodo: '2026-09-01',
    fechaDeEmision: '2026-01-01',
  };

  it('manda sobre no vinculado y fuera de plazo', () => {
    expect(determinarMotivoSinCredito(base).motivo).toBe('empresa_sin_credito');
  });

  it('pierde contra exento, pequeño contribuyente y la casilla desmarcada', () => {
    expect(determinarMotivoSinCredito({ ...base, iva: 0, exento: 5000 }).motivo).toBe('exento');
    expect(determinarMotivoSinCredito({ ...base, tipo: 'factura_pequeno_contribuyente' }).motivo).toBe(
      'pequeno_contribuyente',
    );
    expect(determinarMotivoSinCredito({ ...base, muestraEnReportesSat: false }).motivo).toBeNull();
  });

  it('con crédito se siguen evaluando no vinculado y fuera de plazo', () => {
    expect(determinarMotivoSinCredito({ ...base, empresaConCreditoFiscal: true }).motivo).toBe('no_vinculado');
    expect(determinarMotivoSinCredito({ ...base, empresaConCreditoFiscal: true, noVinculado: false }).motivo).toBe(
      'fuera_de_plazo',
    );
  });
});

describe('empresa en el régimen opcional simplificado (sin ISR sobre utilidades)', () => {
  it('el aviso del año anterior habla solo de la contabilidad', () => {
    const documento = calcularDocumento(
      factura({
        empresaConCreditoFiscal: true,
        empresaConIsrSobreUtilidades: false,
        fechaDeEmision: '2025-12-20',
        fechaDeRecepcion: '2026-01-05',
        mesActual: '2026-01-01',
      }),
    );

    expect(documento.avisos).toEqual([AVISO_DE_ANIO_ANTERIOR_SIN_ISR]);
    expect(AVISO_DE_ANIO_ANTERIOR_SIN_ISR).toBe(
      'El gasto corresponde a un año que puede estar cerrado en la contabilidad.',
    );
  });

  it('los avisos de no deducible quitan la parte del ISR y el de factura especial queda', () => {
    const datos = {
      motivo: 'sin_fel' as const,
      autorizacionFel: null,
      nitReceptor: null,
      nitDeLaEmpresa: '1234567',
      proveedor: { tipoDePersona: 'individual' as const, nit: null },
      empresaConIsrSobreUtilidades: false,
    };

    expect(evaluarFueraDelLibro(datos).avisos).toEqual([AVISO_NO_DEDUCIBLE_SIN_ISR, AVISO_FACTURA_ESPECIAL]);
    expect(AVISO_NO_DEDUCIBLE_SIN_ISR).not.toMatch(/ISR/);
    expect(avisosDeConsumidorFinal({ motivo: 'fel_a_consumidor_final', total: 250000 }, false)).toEqual([
      AVISO_DE_CONSUMIDOR_FINAL_GRANDE_SIN_ISR,
    ]);
    expect(AVISO_DE_CONSUMIDOR_FINAL_GRANDE_SIN_ISR).not.toMatch(/deducible/);
  });

  it('la retención rebajada avisa solo la responsabilidad solidaria', () => {
    const rebajada: RetencionDeDocumento = {
      impuesto: 'isr',
      regla: 'isr_opcional_simplificado',
      base: 60000,
      porcentaje: 500,
      montoPropuesto: 3000,
      monto: 0,
      motivoDelAjuste: 'Exento',
      fecha: '2026-10-01',
    };
    const contexto = {
      hoy: '2026-10-04',
      diasHabilesIva: 15,
      diasHabilesIsr: 10,
      calendario: new CalendarioDeLunesAViernes(),
    };

    expect(avisosDeRetenciones([rebajada], { ...contexto, empresaConIsrSobreUtilidades: true })).toEqual([
      AVISO_DE_RETENCION_QUITADA,
    ]);
    const sinIsr = avisosDeRetenciones([rebajada], { ...contexto, empresaConIsrSobreUtilidades: false });
    expect(sinIsr).toEqual([AVISO_DE_RETENCION_QUITADA_SIN_ISR]);
    expect(sinIsr[0]).not.toMatch(/deducible/);
  });
});

describe('DatosFiscalesDeEmpresa: crédito fiscal e ISR sobre utilidades', () => {
  const datos = (cambios: Partial<Parameters<typeof DatosFiscalesDeEmpresa.crear>[0]>) =>
    DatosFiscalesDeEmpresa.crear({ ...DatosFiscalesDeEmpresa.porOmision().instantanea(), ...cambios });

  it('solo el régimen general da crédito fiscal', () => {
    expect(DatosFiscalesDeEmpresa.porOmision().daCreditoFiscal()).toBe(true);
    expect(datos({ regimenIva: 'pequeno_contribuyente' }).daCreditoFiscal()).toBe(false);
  });

  it('el ISR sobre utilidades no es el régimen opcional simplificado', () => {
    expect(DatosFiscalesDeEmpresa.porOmision().tieneIsrSobreUtilidades()).toBe(true);
    expect(datos({ regimenIsr: 'opcional_simplificado' }).tieneIsrSobreUtilidades()).toBe(false);
  });
});
