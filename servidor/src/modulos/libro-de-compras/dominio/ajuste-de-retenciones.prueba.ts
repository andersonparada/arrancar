import { describe, expect, it } from 'vitest';
import { fijarRetenciones, retencionesAjustadas } from './ajuste-de-retenciones.js';
import { AjusteDeRetencionInvalido, MotivoDelAjusteObligatorio } from './errores-de-documento.js';
import type { RetencionPropuesta } from './retencion-propuesta.js';

const fechas = { emision: '2026-10-01', recepcion: '2026-10-04' };

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

describe('fijar las retenciones al registrar', () => {
  it('sin ajustes deja lo propuesto, con la fecha de recepción o de emisión según la regla', () => {
    expect(fijarRetenciones([iva, isr], [], fechas)).toEqual([
      expect.objectContaining({
        regla: 'iva_contribuyente_especial',
        monto: 9000,
        motivoDelAjuste: null,
        fecha: '2026-10-04',
      }),
      expect.objectContaining({
        regla: 'isr_opcional_simplificado',
        monto: 25000,
        motivoDelAjuste: null,
        fecha: '2026-10-01',
      }),
    ]);
  });

  it('quitar o cambiar el monto con motivo lo guarda junto con la propuesta', () => {
    const [quitada, cambiada] = fijarRetenciones(
      [iva, isr],
      [
        { regla: 'iva_contribuyente_especial', monto: 0, motivo: ' Exento ' },
        { regla: 'isr_opcional_simplificado', monto: 10000, motivo: 'Pago directo' },
      ],
      fechas,
    );

    expect(quitada).toMatchObject({ montoPropuesto: 9000, monto: 0, motivoDelAjuste: 'Exento' });
    expect(cambiada).toMatchObject({ montoPropuesto: 25000, monto: 10000, motivoDelAjuste: 'Pago directo' });
  });

  it('dejar el mismo monto no pide motivo ni cuenta como ajuste', () => {
    const fijadas = fijarRetenciones(
      [iva],
      [{ regla: 'iva_contribuyente_especial', monto: 9000, motivo: null }],
      fechas,
    );

    expect(fijadas[0]?.motivoDelAjuste).toBeNull();
    expect(retencionesAjustadas(fijadas)).toEqual([]);
  });

  it('cambiar el monto sin motivo o con motivo en blanco se rechaza', () => {
    for (const motivo of [null, '   ']) {
      const ajuste = { regla: iva.regla, monto: 100, motivo };
      expect(() => fijarRetenciones([iva], [ajuste], fechas)).toThrow(MotivoDelAjusteObligatorio);
    }
  });

  it('rechaza un monto fuera de 0 a la base, una retención que no se propuso y un ajuste repetido', () => {
    const ajuste = (monto: number) => [{ regla: iva.regla, monto, motivo: 'x' }];

    expect(() => fijarRetenciones([iva], ajuste(60001), fechas)).toThrow(AjusteDeRetencionInvalido);
    expect(() => fijarRetenciones([iva], ajuste(-1), fechas)).toThrow(AjusteDeRetencionInvalido);
    expect(() => fijarRetenciones([iva], ajuste(10.5), fechas)).toThrow(AjusteDeRetencionInvalido);
    expect(() => fijarRetenciones([iva], [{ regla: isr.regla, monto: 0, motivo: 'x' }], fechas)).toThrow(
      AjusteDeRetencionInvalido,
    );
    expect(() => fijarRetenciones([iva], [...ajuste(0), ...ajuste(1)], fechas)).toThrow(AjusteDeRetencionInvalido);
  });
});
