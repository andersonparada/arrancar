import { describe, expect, it } from 'vitest';
import {
  AYUDA_DE_ANULAR,
  CAUSAS_DE_ANULACION,
  textoDeCausa,
  FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019,
  MOTIVOS_SIN_CREDITO,
  REGLAS_DE_RETENCION,
  TIPOS_DE_DOCUMENTO,
  mesDeFecha,
  textoDelEnlaceALaFactura,
  textoFueraDelLibro,
} from './textos-de-documentos';
import type { TipoDeDocumento } from './servicios/documentos.api';

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

describe('nota de débito del proveedor', () => {
  it('la familia tiene su nombre en los filtros, la lista y la ficha', () => {
    expect(TIPOS_DE_DOCUMENTO.nota_de_debito).toBe('Nota de débito del proveedor');
  });

  it('el motivo de la nota tardía dice que no da crédito y que el IVA va al costo', () => {
    expect(MOTIVOS_SIN_CREDITO.nota_de_debito_tardia).toBe(
      'La nota de débito se emitió más de dos meses después de su factura: no da crédito fiscal (Ley del IVA, art. 17). El IVA se suma al costo o gasto.',
    );
  });

  it('el enlace a la factura dice si la nota la aumenta o la rebaja', () => {
    expect(textoDelEnlaceALaFactura('nota_de_debito')).toBe('Ver la factura que aumenta esta nota');
    expect(textoDelEnlaceALaFactura('nota_de_credito')).toBe('Ver la factura que rebaja esta nota');
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

describe('familias de documento', () => {
  it('cada familia nueva tiene su nombre en la lista y la ficha', () => {
    expect(TIPOS_DE_DOCUMENTO.factura_pequeno_contribuyente_electronico).toBe(
      'Factura de pequeño contribuyente electrónico (régimen derogado)',
    );
    expect(TIPOS_DE_DOCUMENTO.factura_contribuyente_agropecuario).toBe(
      'Factura de contribuyente agropecuario (régimen derogado)',
    );
    expect(TIPOS_DE_DOCUMENTO.factura_primario_pecuario).toBe('Factura de productor primario o pecuario');
    expect(TIPOS_DE_DOCUMENTO.factura_especial).toBe('Factura especial (emitida por la empresa)');
  });

  it('las familias de antes conservan su texto', () => {
    expect(TIPOS_DE_DOCUMENTO.factura).toBe('Factura');
    expect(TIPOS_DE_DOCUMENTO.factura_pequeno_contribuyente).toBe('Factura de pequeño contribuyente');
    expect(TIPOS_DE_DOCUMENTO.nota_de_credito).toBe('Nota de crédito del proveedor');
    expect(TIPOS_DE_DOCUMENTO.recibo).toBe('Recibo');
  });

  it('todas las familias del tipo tienen texto', () => {
    const familias: TipoDeDocumento[] = [
      'factura',
      'factura_pequeno_contribuyente',
      'factura_pequeno_contribuyente_electronico',
      'factura_contribuyente_agropecuario',
      'factura_primario_pecuario',
      'factura_especial',
      'nota_de_credito',
      'nota_de_debito',
      'recibo',
    ];
    expect(Object.keys(TIPOS_DE_DOCUMENTO).sort()).toEqual([...familias].sort());
  });
});

describe('motivos de los regímenes que dan nombre propio', () => {
  it('el agropecuario y el primario y pecuario usan su texto revisado', () => {
    expect(MOTIVOS_SIN_CREDITO.contribuyente_agropecuario).toBe(
      'Factura de un contribuyente agropecuario, régimen eliminado en julio de 2025 (Decreto 31-2024): no da crédito fiscal. El total se registra como costo o gasto.',
    );
    expect(MOTIVOS_SIN_CREDITO.primario_pecuario).toContain('no da crédito fiscal');
  });
});

describe('causa de anulación de la factura especial', () => {
  it('la emite la propia empresa, así que el emisor no es otro', () => {
    expect(textoDeCausa('fel_anulada_por_el_emisor', 'factura_especial')).toBe('FESP anulada por la empresa');
    expect(textoDeCausa('fel_anulada_por_el_emisor', 'factura')).toBe('El emisor anuló la FEL en la SAT');
    expect(textoDeCausa('error_de_captura', 'factura_especial')).toBe('Error de captura');
  });
});
