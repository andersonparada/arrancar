import { describe, expect, it } from 'vitest';
import { calcularDocumento, type DatosParaCalcular } from './calculo-de-documento.js';
import { DatosFiscalesDeEmpresa } from './datos-fiscales-de-empresa.js';
import {
  IvaDeNotasExcedeElDeLaFactura,
  NotaConIvaDeFacturaExenta,
  NotaDeDebitoAnteriorALaFactura,
  NotaDeDebitoConIvaDeFacturaSinIva,
} from './errores-de-calculo.js';
import {
  AVISO_NOTA_DE_DEBITO_SOBRE_FACTURA_SIN_CREDITO,
  determinarMotivoSinCredito,
  type DatosParaElMotivo,
} from './motivo-sin-credito.js';
import { exigirPeriodoValido, periodoPropuesto } from './periodo-del-libro.js';
import { AVISO_DE_NOTA_DE_DEBITO_TARDIA, esNotaDeDebitoTardia } from './plazo-de-la-nota-de-debito.js';
import {
  AVISO_DE_INTERESES_EN_NOTA_DE_DEBITO,
  AVISO_DE_RETENCION_SOBRE_NOTA_DE_DEBITO,
  avisosDeNotaDeDebito,
} from './reglas-de-notas-de-debito.js';
import { esNota, FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO } from './tipos-de-documento.js';

const motivo = (cambios: Partial<DatosParaElMotivo> = {}) =>
  determinarMotivoSinCredito({
    tipo: 'nota_de_debito',
    muestraEnReportesSat: true,
    noVinculado: false,
    empresaConCreditoFiscal: true,
    total: 11200,
    exento: 0,
    iva: 1200,
    periodo: '2026-04-01',
    fechaDeEmision: '2026-04-10',
    fechaDeLaFactura: '2026-03-10',
    motivoDeLaFactura: null,
    ...cambios,
  });

const calcular = (cambios: Partial<DatosParaCalcular> = {}) =>
  calcularDocumento({
    tipo: 'nota_de_debito',
    muestraEnReportesSat: true,
    noVinculado: false,
    empresaConCreditoFiscal: true,
    empresaConIsrSobreUtilidades: true,
    fechaDeEmision: '2026-04-10',
    fechaDeRecepcion: '2026-04-12',
    periodo: '2026-04-01',
    fechaDeLaFactura: '2026-03-10',
    motivoDeLaFactura: null,
    lineas: [{ total: 11200, exento: 0 }],
    tasaDeIva: 1200,
    mesActual: '2026-04-01',
    ...cambios,
  });

describe('esNotaDeDebitoTardia (art. 17)', () => {
  it('la víspera del aniversario todavía está a tiempo y el aniversario ya no', () => {
    expect(esNotaDeDebitoTardia('2026-03-14', '2026-01-15')).toBe(false);
    expect(esNotaDeDebitoTardia('2026-03-15', '2026-01-15')).toBe(true);
  });

  it('la nota emitida el mismo día de su factura está a tiempo', () => {
    expect(esNotaDeDebitoTardia('2026-01-15', '2026-01-15')).toBe(false);
  });
});

describe('motivo de la nota de débito: se evalúa como documento propio', () => {
  it('sobre una factura con crédito, en plazo: da crédito', () => {
    expect(motivo()).toEqual({ motivo: null, avisos: [] });
  });

  it('registrada cuatro meses después de su emisión: fuera de plazo por el art. 20, desde su propia emisión', () => {
    const resultado = motivo({ periodo: '2026-08-01' });

    expect(resultado.motivo).toBe('fuera_de_plazo');
    expect(resultado.avisos).toHaveLength(1);
  });

  it('de una factura fuera de plazo pero en su mes: da crédito (no hereda el plazo de otro documento)', () => {
    expect(motivo({ motivoDeLaFactura: 'fuera_de_plazo' })).toEqual({ motivo: null, avisos: [] });
  });

  it('de una factura registrada sin crédito, en un período general: da crédito, con aviso', () => {
    expect(motivo({ motivoDeLaFactura: 'empresa_sin_credito' })).toEqual({
      motivo: null,
      avisos: [AVISO_NOTA_DE_DEBITO_SOBRE_FACTURA_SIN_CREDITO],
    });
  });

  it('en un período sin crédito: empresa_sin_credito, aunque su factura sí diera crédito', () => {
    expect(motivo({ empresaConCreditoFiscal: false })).toEqual({ motivo: 'empresa_sin_credito', avisos: [] });
  });

  it('hereda no_vinculado de su factura; el usuario puede agregarlo pero no quitarlo', () => {
    expect(motivo({ motivoDeLaFactura: 'no_vinculado' }).motivo).toBe('no_vinculado');
    expect(motivo({ motivoDeLaFactura: 'no_vinculado', noVinculado: false }).motivo).toBe('no_vinculado');
    expect(motivo({ noVinculado: true }).motivo).toBe('no_vinculado');
  });

  it('emitida después de los dos meses de su factura: nota_de_debito_tardia con aviso', () => {
    const resultado = motivo({ fechaDeEmision: '2026-05-10', periodo: '2026-05-01' });

    expect(resultado).toEqual({ motivo: 'nota_de_debito_tardia', avisos: [AVISO_DE_NOTA_DE_DEBITO_TARDIA] });
  });

  it('el último día del plazo del art. 17 (la víspera) todavía da crédito', () => {
    expect(motivo({ fechaDeEmision: '2026-05-09', periodo: '2026-05-01' }).motivo).toBeNull();
  });

  it('el art. 17 manda sobre el art. 20 cuando las dos se cumplen', () => {
    expect(motivo({ fechaDeEmision: '2026-05-10', periodo: '2026-09-01' }).motivo).toBe('nota_de_debito_tardia');
  });

  it('orden: empresa_sin_credito y no_vinculado van antes del art. 17', () => {
    const tardia = { fechaDeEmision: '2026-05-10', periodo: '2026-05-01' };

    expect(motivo({ ...tardia, noVinculado: true }).motivo).toBe('no_vinculado');
    expect(motivo({ ...tardia, noVinculado: true, empresaConCreditoFiscal: false }).motivo).toBe('empresa_sin_credito');
  });

  it('de una factura sin IVA hereda el motivo de su familia, antes que cualquier otro', () => {
    const resultado = motivo({
      motivoDeLaFactura: 'pequeno_contribuyente',
      iva: 0,
      empresaConCreditoFiscal: false,
      fechaDeEmision: '2026-05-10',
    });

    expect(resultado).toEqual({ motivo: 'pequeno_contribuyente', avisos: [] });
  });

  it('todo exento con IVA cero: exento; la casilla desmarcada no tiene motivo', () => {
    expect(motivo({ iva: 0, exento: 11200 }).motivo).toBe('exento');
    expect(motivo({ muestraEnReportesSat: false, noVinculado: true }).motivo).toBeNull();
  });
});

describe('calcularDocumento: nota de débito', () => {
  it('da crédito: IVA 12 % y nada al costo', () => {
    const documento = calcular();

    expect(documento.motivoSinCredito).toBeNull();
    expect(documento.totales).toEqual({ total: 11200, base: 10000, iva: 1200, ivaNoAcreditable: 0, idp: 0, exento: 0 });
  });

  it('tardía por el art. 17: el IVA va al costo de cada línea', () => {
    const documento = calcular({ fechaDeEmision: '2026-05-10', fechaDeRecepcion: '2026-05-12', periodo: '2026-05-01' });

    expect(documento.motivoSinCredito).toBe('nota_de_debito_tardia');
    expect(documento.lineas.every((linea) => linea.ivaNoAcreditable === linea.iva)).toBe(true);
    expect(documento.totales.ivaNoAcreditable).toBe(1200);
  });

  it('puede registrarse en el mes en que se recibe, distinto del de su emisión', () => {
    expect(calcular({ fechaDeRecepcion: '2026-05-20', periodo: '2026-05-01' }).motivoSinCredito).toBeNull();
    expect(calcular({ fechaDeRecepcion: '2026-05-20', periodo: '2026-04-01' }).motivoSinCredito).toBeNull();
  });

  it('de una factura de pequeño contribuyente: IVA cero y su motivo', () => {
    const documento = calcular({ motivoDeLaFactura: 'pequeno_contribuyente' });

    expect(documento.motivoSinCredito).toBe('pequeno_contribuyente');
    expect(documento.totales).toMatchObject({ iva: 0, base: 11200 });
  });

  it('con IVA de la FEL sobre una factura que no lo cobra es un error', () => {
    expect(() => calcular({ motivoDeLaFactura: 'primario_pecuario', ivaDeLaFel: 1200 })).toThrow(
      NotaDeDebitoConIvaDeFacturaSinIva,
    );
  });

  it('sobre una factura exenta con IVA es un error que manda anular la nota', () => {
    const intento = () => calcular({ motivoDeLaFactura: 'exento' });

    expect(intento).toThrow(NotaConIvaDeFacturaExenta);
    expect(intento).toThrow(/anule la nota y emita una factura por el cargo gravado/);
    expect(() => calcular({ motivoDeLaFactura: 'exento', lineas: [{ total: 5000, exento: 5000 }] })).not.toThrow();
  });

  it('anterior a la fecha de su factura es un error; el mismo día no', () => {
    const anterior = () => calcular({ fechaDeLaFactura: '2026-04-11' });

    expect(anterior).toThrow(NotaDeDebitoAnteriorALaFactura);
    expect(() => calcular({ fechaDeLaFactura: '2026-04-10' })).not.toThrow();
  });

  it('no tiene tope de IVA: aumenta la factura', () => {
    expect(() => calcular({ ivaDeLaFactura: 100, ivaRebajadoPorOtrasNotas: 99999 })).not.toThrow();
  });
});

describe('calcularDocumento: la nota de crédito cabe en la factura más sus notas de débito', () => {
  const credito = (cambios: Partial<DatosParaCalcular> = {}) =>
    calcular({ tipo: 'nota_de_credito', fechaDeRecepcion: '2026-04-12', ...cambios });

  it('el IVA rebajado puede llegar al IVA de la factura más el de sus notas de débito', () => {
    expect(() => credito({ ivaDeLaFactura: 2400, ivaRebajadoPorOtrasNotas: 1200 })).not.toThrow();
    expect(() => credito({ ivaDeLaFactura: 2400, ivaRebajadoPorOtrasNotas: 1201 })).toThrow(
      IvaDeNotasExcedeElDeLaFactura,
    );
  });
});

describe('período de la nota de débito', () => {
  const fechas = { tipo: 'nota_de_debito', fechaDeEmision: '2026-03-28', fechaDeRecepcion: '2026-04-02' } as const;

  it('se propone como una factura: el mes de recepción, nunca antes del de emisión', () => {
    expect(periodoPropuesto(fechas)).toBe('2026-04-01');
    expect(periodoPropuesto({ ...fechas, fechaDeEmision: '2026-04-01' })).toBe('2026-04-01');
  });

  it('no se obliga a ir en el mes de recepción, pero no puede ser anterior al de emisión', () => {
    expect(() => exigirPeriodoValido({ ...fechas, periodo: '2026-03-01' })).not.toThrow();
    expect(() => exigirPeriodoValido({ ...fechas, periodo: '2026-05-01' })).not.toThrow();
    expect(() => exigirPeriodoValido({ ...fechas, periodo: '2026-02-01' })).toThrow();
  });
});

describe('avisos de la nota de débito', () => {
  const empresa = (cambios: { agente?: 'ninguno' | 'otro'; agenteDeIsr?: boolean }) =>
    DatosFiscalesDeEmpresa.crear({
      tipoDePersona: 'juridica',
      regimenIva: 'general',
      regimenIsr: 'utilidades',
      agenteDeRetencionIva: cambios.agente ?? 'ninguno',
      esAgenteDeRetencionIsr: cambios.agenteDeIsr ?? false,
    });

  it('a la empresa agente de IVA o de ISR se le recuerda consultar la retención', () => {
    expect(avisosDeNotaDeDebito({ empresa: empresa({ agente: 'otro' }) })).toEqual([
      AVISO_DE_RETENCION_SOBRE_NOTA_DE_DEBITO,
    ]);
    expect(avisosDeNotaDeDebito({ empresa: empresa({ agenteDeIsr: true }) })).toEqual([
      AVISO_DE_RETENCION_SOBRE_NOTA_DE_DEBITO,
    ]);
    expect(avisosDeNotaDeDebito({ empresa: empresa({}) })).toEqual([]);
  });

  it('con intereses avisa del gasto financiero y la renta de capital; las otras clases no', () => {
    const aviso = avisosDeNotaDeDebito({ empresa: empresa({}), claseDeCargo: 'intereses' });

    expect(aviso).toEqual([AVISO_DE_INTERESES_EN_NOTA_DE_DEBITO]);
    expect(AVISO_DE_INTERESES_EN_NOTA_DE_DEBITO).toBe(
      'Los intereses son gasto financiero y podrían llevar retención sobre rentas de capital; consulte a su contador.',
    );
    expect(avisosDeNotaDeDebito({ empresa: empresa({}), claseDeCargo: 'precio' })).toEqual([]);
    expect(avisosDeNotaDeDebito({ empresa: empresa({}), claseDeCargo: 'otros' })).toEqual([]);
  });

  it('el aviso de las retenciones dice lo acordado', () => {
    expect(AVISO_DE_RETENCION_SOBRE_NOTA_DE_DEBITO).toBe(
      'Verifique con su contador si debe retener sobre esta nota de débito.',
    );
  });
});

describe('familias de nota', () => {
  it('las dos notas son notas; la factura, el recibo y la especial no', () => {
    expect(esNota('nota_de_credito')).toBe(true);
    expect(esNota('nota_de_debito')).toBe(true);
    expect(esNota('factura')).toBe(false);
    expect(esNota('recibo')).toBe(false);
  });

  it('las facturas admiten nota; la especial, el recibo y las notas no', () => {
    expect(FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO).toHaveLength(5);
    expect(FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO).not.toContain('factura_especial');
    expect(FAMILIAS_QUE_ADMITEN_NOTA_DE_DEBITO).not.toContain('nota_de_debito');
  });
});
