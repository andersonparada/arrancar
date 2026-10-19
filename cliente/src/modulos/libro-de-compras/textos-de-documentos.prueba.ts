import { describe, expect, it } from 'vitest';
import {
  AYUDA_DE_ANULAR,
  CAUSAS_DE_ANULACION,
  FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019,
  MOTIVOS_SIN_CREDITO,
  REGLAS_DE_RETENCION,
  mesDeFecha,
  textoFueraDelLibro,
} from './textos-de-documentos';

describe('mes de la derogación', () => {
  it('se escribe en español a partir de la fecha AAAA-MM-DD', () => {
    expect(FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019).toBe('2025-07-09');
    expect(mesDeFecha(FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019)).toBe('julio de 2025');
    expect(mesDeFecha('2024-12-01')).toBe('diciembre de 2024');
  });

  it('el motivo del contribuyente agropecuario lo usa', () => {
    expect(MOTIVOS_SIN_CREDITO.contribuyente_agropecuario).toContain('régimen eliminado en julio de 2025');
  });
});

describe('textos de los motivos sin crédito nuevos', () => {
  it('el primario o pecuario dice que no da crédito fiscal', () => {
    expect(MOTIVOS_SIN_CREDITO.primario_pecuario).toBe(
      'Compra a un productor primario o pecuario (Decreto 31-2024): su factura no da crédito fiscal. El monto se registra como costo o gasto.',
    );
  });
});

describe('fuera del libro', () => {
  it('sin ISR sobre utilidades, el texto es el del motivo', () => {
    expect(textoFueraDelLibro('sin_fel')).toBe(
      'Documento sin FEL (por ejemplo, recibo de un proveedor informal): la SAT no lo conoce, así que no se reporta ni da crédito fiscal.',
    );
    expect(textoFueraDelLibro('fel_a_otro_nit', false)).toBe(
      'La FEL se emitió a nombre de otra persona (otro NIT o CUI), no de la empresa: no se reporta a la SAT ni da crédito fiscal.',
    );
  });

  it('con ISR sobre utilidades agrega la advertencia de deducibilidad', () => {
    expect(textoFueraDelLibro('fel_a_consumidor_final', true)).toBe(
      'La FEL se emitió a consumidor final (CF) y no a nombre de la empresa: no se reporta a la SAT ni da crédito fiscal. Puede no ser deducible del ISR.',
    );
  });
});

describe('textos de la anulación', () => {
  it('las causas y la ayuda usan el texto revisado', () => {
    expect(CAUSAS_DE_ANULACION.fel_anulada_por_el_emisor).toBe('El emisor anuló la FEL en la SAT');
    expect(CAUSAS_DE_ANULACION.no_corresponde_a_la_empresa).toBe('No es una compra de esta empresa');
    expect(AYUDA_DE_ANULAR).toContain('únicamente el registro en Arrancar');
    expect(AYUDA_DE_ANULAR).toContain('use una nota de crédito');
  });
});

describe('reglas de retención', () => {
  it('cada regla nueva tiene su texto', () => {
    expect(REGLAS_DE_RETENCION.iva_factura_especial).toBe('Retención del 100 % del IVA: factura especial');
    expect(REGLAS_DE_RETENCION.isr_factura_especial).toBe('Retención de ISR (pago único): factura especial');
  });
});
