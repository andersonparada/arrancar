import { describe, expect, it } from 'vitest';
import { fijarRetenciones, retencionesAjustadas } from './ajuste-de-retenciones.js';
import { aplicarRetencionPracticada, type DocumentoAnuladoConRetenciones } from './retencion-practicada.js';
import type { RetencionPropuesta } from './retencion-propuesta.js';

const iva: RetencionPropuesta = {
  impuesto: 'iva',
  regla: 'iva_contribuyente_especial',
  base: 60000,
  porcentaje: 1500,
  montoPropuesto: 9000,
  origenDeLaFecha: 'recepcion',
};
const isr: RetencionPropuesta = {
  impuesto: 'isr',
  regla: 'isr_opcional_simplificado',
  base: 500000,
  porcentaje: null,
  montoPropuesto: 25000,
  origenDeLaFecha: 'emision',
};
const anulado = (cambios: Partial<DocumentoAnuladoConRetenciones> = {}): DocumentoAnuladoConRetenciones => ({
  serie: 'A',
  numero: '15',
  retenciones: [{ impuesto: 'iva', regla: 'iva_contribuyente_especial', monto: 7500 }],
  ...cambios,
});
const fechas = { emision: '2026-10-01', recepcion: '2026-10-04' };

describe('retención ya practicada en un documento anulado', () => {
  it('sin documento anulado, o sin retenciones en él, no cambia nada ni avisa', () => {
    expect(aplicarRetencionPracticada([iva, isr], null)).toEqual({ propuestas: [iva, isr], enCero: [], avisos: [] });
    expect(aplicarRetencionPracticada([iva], anulado({ retenciones: [] }))).toEqual({
      propuestas: [iva],
      enCero: [],
      avisos: [],
    });
  });

  it('deja en cero solo las reglas que ya se retuvieron, con el motivo y lo que habría propuesto', () => {
    const resultado = aplicarRetencionPracticada([iva, isr], anulado());

    expect(resultado.propuestas[0]).toMatchObject({
      regla: 'iva_contribuyente_especial',
      montoPropuesto: 0,
      motivoAutomatico: 'Practicada en el documento anulado A-15',
    });
    expect(resultado.propuestas[1]).toEqual(isr);
    expect(resultado.enCero).toEqual([{ regla: 'iva_contribuyente_especial', montoCalculado: 9000 }]);
  });

  it('el aviso muestra lo que ya se retuvo por impuesto', () => {
    const retenciones = [
      { impuesto: 'iva' as const, regla: 'iva_contribuyente_especial' as const, monto: 7500 },
      { impuesto: 'isr' as const, regla: 'isr_opcional_simplificado' as const, monto: 1000 },
    ];

    const { avisos } = aplicarRetencionPracticada([iva], anulado({ retenciones }));

    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('Practicada en el documento anulado A-15: ya se retuvo IVA Q75.00 e ISR Q10.00');
  });

  it('sin serie la etiqueta es solo el número', () => {
    const { propuestas } = aplicarRetencionPracticada([iva], anulado({ serie: null }));

    expect(propuestas[0]?.motivoAutomatico).toBe('Practicada en el documento anulado 15');
  });

  it('al fijarla queda en cero con su motivo, sin contar como ajuste del usuario', () => {
    const { propuestas } = aplicarRetencionPracticada([iva], anulado());

    const [retencion] = fijarRetenciones(propuestas, [], fechas);

    expect(retencion).toMatchObject({
      monto: 0,
      montoPropuesto: 0,
      motivoDelAjuste: 'Practicada en el documento anulado A-15',
    });
    expect(retencionesAjustadas([retencion!])).toEqual([]);
  });

  it('si el usuario la cambia, sí es un ajuste suyo y necesita su propio motivo', () => {
    const { propuestas } = aplicarRetencionPracticada([iva], anulado());

    const [retencion] = fijarRetenciones(
      propuestas,
      [{ regla: 'iva_contribuyente_especial', monto: 9000, motivo: 'La primera se devolvió' }],
      fechas,
    );

    expect(retencion).toMatchObject({ monto: 9000, motivoDelAjuste: 'La primera se devolvió' });
    expect(retencionesAjustadas([retencion!])).toHaveLength(1);
  });
});
