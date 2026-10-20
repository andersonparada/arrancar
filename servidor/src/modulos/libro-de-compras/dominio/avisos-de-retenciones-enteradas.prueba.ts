import { describe, expect, it } from 'vitest';
import { AVISO_DE_MES_YA_ENTERADO, avisosDeRetenciones, type ContextoDeEntero } from './avisos-de-retenciones.js';
import { CalendarioDeLunesAViernes } from './calendario-laboral.js';
import type { RetencionDeDocumento } from './documento-de-compra.js';

const retencion: RetencionDeDocumento = {
  impuesto: 'iva',
  regla: 'iva_contribuyente_especial',
  base: 10000,
  porcentaje: 1500,
  montoPropuesto: 1500,
  monto: 1500,
  motivoDelAjuste: null,
  fecha: '2026-09-10',
};

const contexto = (cambios: Partial<ContextoDeEntero> = {}): ContextoDeEntero => ({
  hoy: '2026-11-02',
  diasHabilesIva: 15,
  diasHabilesIsr: 10,
  calendario: new CalendarioDeLunesAViernes(),
  empresaConIsrSobreUtilidades: true,
  ...cambios,
});

describe('avisos de entero de las retenciones', () => {
  it('avisa del plazo vencido si el mes y grupo no tiene ningún entero', () => {
    const avisos = avisosDeRetenciones([retencion], contexto());

    expect(avisos).toEqual([expect.stringContaining('venció el 21/10/2026')]);
  });

  it('con el mes y grupo ya enterado apaga el aviso de vencido y pide pagar la diferencia', () => {
    const avisos = avisosDeRetenciones([retencion], contexto({ gruposEnterados: new Set(['2026-09-01|iva_agentes']) }));

    expect(avisos).toEqual([AVISO_DE_MES_YA_ENTERADO]);
  });

  it('un entero de otro grupo o de otro mes no apaga el aviso', () => {
    const otros = new Set(['2026-09-01|isr_opcional', '2026-08-01|iva_agentes']);

    const avisos = avisosDeRetenciones([retencion], contexto({ gruposEnterados: otros }));

    expect(avisos).toEqual([expect.stringContaining('venció el 21/10/2026')]);
  });

  it('una retención en cero no avisa nada', () => {
    const avisos = avisosDeRetenciones(
      [{ ...retencion, monto: 0, montoPropuesto: 0 }],
      contexto({ gruposEnterados: new Set(['2026-09-01|iva_agentes']) }),
    );

    expect(avisos).toEqual([]);
  });
});
