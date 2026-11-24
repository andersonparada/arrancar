import { describe, expect, it } from 'vitest';
import { DocumentoInvalido } from './errores-de-documento.js';
import {
  FacturaAnteriorInvalida,
  FacturaNoSirveParaLaNota,
  NotaAnteriorALaFactura,
  NotaConDosFacturas,
  NotaExcedeLaFactura,
  NotaSinFactura,
  NotaSobreFacturaEspecial,
} from './errores-de-notas.js';
import {
  AVISO_DE_NOTA_DE_ABONO,
  AVISO_DE_NOTA_DE_CREDITO_TARDIA,
  avisosDeLaNota,
  esNotaDeCreditoTardia,
  exigirFacturaAnteriorValida,
  exigirFacturaQueAdmiteLaNota,
  avisoDeIvaDeNotasPorRedondeo,
  exigirQueLaNotaNoSupereLaFactura,
  exigirReferenciaCoherente,
  type FacturaConNotas,
  type FacturaDeLaNota,
} from './reglas-de-notas.js';

const factura = (cambios: Partial<FacturaDeLaNota> = {}): FacturaDeLaNota => ({
  tipo: 'factura',
  estado: 'vigente',
  clienteId: 'cliente-1',
  fechaEmision: '2026-03-15',
  ...cambios,
});
const nota = { tipo: 'nota_de_credito', clienteId: 'cliente-1', fechaEmision: '2026-03-20' } as const;

describe('qué corrige una nota', () => {
  const afectada = '33333333-3333-4333-8333-333333333333';
  const anterior = { serie: 'A', numero: '10', fecha: '2025-12-01' };

  it('una nota sin factura es error, y con las dos también', () => {
    const base = { tipo: 'nota_de_credito', documentoAfectadoId: null, facturaAnterior: null } as const;

    expect(() => exigirReferenciaCoherente(base)).toThrow(NotaSinFactura);
    expect(() =>
      exigirReferenciaCoherente({ ...base, documentoAfectadoId: afectada, facturaAnterior: anterior }),
    ).toThrow(NotaConDosFacturas);
    expect(() => exigirReferenciaCoherente({ ...base, documentoAfectadoId: afectada })).not.toThrow();
    expect(() => exigirReferenciaCoherente({ ...base, facturaAnterior: anterior })).not.toThrow();
  });

  it('lo que no es nota no corrige nada', () => {
    const intento = () =>
      exigirReferenciaCoherente({ tipo: 'factura', documentoAfectadoId: afectada, facturaAnterior: null });

    expect(intento).toThrow(DocumentoInvalido);
  });

  it('la factura del sistema anterior debe ser anterior a la fecha de inicio y a la nota', () => {
    const contexto = { fechaDeInicio: '2026-01-01', fechaDeLaNota: '2026-02-01' };

    expect(() => exigirFacturaAnteriorValida(anterior, contexto)).not.toThrow();
    expect(() => exigirFacturaAnteriorValida({ ...anterior, fecha: '2026-01-01' }, contexto)).toThrow(
      FacturaAnteriorInvalida,
    );
    expect(() => exigirFacturaAnteriorValida(anterior, { ...contexto, fechaDeInicio: null })).toThrow(
      FacturaAnteriorInvalida,
    );
    expect(() => exigirFacturaAnteriorValida(anterior, { ...contexto, fechaDeLaNota: '2025-11-01' })).toThrow(
      NotaAnteriorALaFactura,
    );
  });
});

describe('la factura que corrige una nota', () => {
  it('se acepta una factura vigente del mismo cliente', () => {
    expect(() => exigirFacturaQueAdmiteLaNota(factura(), nota)).not.toThrow();
    expect(() => exigirFacturaQueAdmiteLaNota(factura({ tipo: 'factura_cambiaria' }), nota)).not.toThrow();
  });

  it('una nota sobre la factura especial recibida es error propio, sea la nota que sea', () => {
    const especial = factura({ tipo: 'factura_especial_recibida' });

    expect(() => exigirFacturaQueAdmiteLaNota(especial, nota)).toThrow(NotaSobreFacturaEspecial);
    expect(() => exigirFacturaQueAdmiteLaNota(especial, { ...nota, tipo: 'nota_de_debito' })).toThrow(
      NotaSobreFacturaEspecial,
    );
  });

  it('rechaza anulada, de otro cliente, otra familia o posterior a la nota', () => {
    expect(() => exigirFacturaQueAdmiteLaNota(factura({ estado: 'anulado' }), nota)).toThrow(FacturaNoSirveParaLaNota);
    expect(() => exigirFacturaQueAdmiteLaNota(factura({ clienteId: 'otro' }), nota)).toThrow(FacturaNoSirveParaLaNota);
    expect(() => exigirFacturaQueAdmiteLaNota(factura({ tipo: 'nota_de_debito' }), nota)).toThrow(
      FacturaNoSirveParaLaNota,
    );
    expect(() => exigirFacturaQueAdmiteLaNota(factura({ tipo: 'recibo' }), nota)).toThrow(FacturaNoSirveParaLaNota);
    expect(() => exigirFacturaQueAdmiteLaNota(factura({ fechaEmision: '2026-04-01' }), nota)).toThrow(
      NotaAnteriorALaFactura,
    );
  });
});

describe('tope de las notas de crédito', () => {
  const conNotas = (cambios: Partial<FacturaConNotas> = {}): FacturaConNotas => ({
    total: 11200,
    iva: 1200,
    totalDeNotasDeCredito: 0,
    ivaDeNotasDeCredito: 0,
    cantidadDeNotasDeCredito: 0,
    totalDeNotasDeDebito: 0,
    ivaDeNotasDeDebito: 0,
    ...cambios,
  });

  it('cabe hasta el total de la factura, también sumando notas anteriores', () => {
    expect(() =>
      exigirQueLaNotaNoSupereLaFactura(conNotas(), { tipo: 'nota_de_credito', total: 11200, iva: 1200 }),
    ).not.toThrow();
    const intento = () =>
      exigirQueLaNotaNoSupereLaFactura(conNotas({ totalDeNotasDeCredito: 5000, ivaDeNotasDeCredito: 500 }), {
        tipo: 'nota_de_credito',
        total: 6201,
        iva: 700,
      });

    expect(intento).toThrow(NotaExcedeLaFactura);
  });

  const conUnaNota = () =>
    conNotas({
      total: 10000,
      iva: 1071,
      totalDeNotasDeCredito: 5000,
      ivaDeNotasDeCredito: 536,
      cantidadDeNotasDeCredito: 1,
    });

  it('la nota que agota el total tolera el redondeo del IVA y avisa los centavos de exceso', () => {
    const avisos = exigirQueLaNotaNoSupereLaFactura(conUnaNota(), { tipo: 'nota_de_credito', total: 5000, iva: 536 });

    expect(avisos).toEqual([avisoDeIvaDeNotasPorRedondeo(1)]);
    expect(avisoDeIvaDeNotasPorRedondeo(1)).toContain('Q0.01');
  });

  it('una segunda nota parcial sin agotar el total tolera el redondeo y avisa', () => {
    const avisos = exigirQueLaNotaNoSupereLaFactura(conUnaNota(), { tipo: 'nota_de_credito', total: 4999, iva: 536 });

    expect(avisos).toHaveLength(1);
  });

  it('sin exceso de IVA no hay aviso', () => {
    const avisos = exigirQueLaNotaNoSupereLaFactura(conNotas(), { tipo: 'nota_de_credito', total: 5600, iva: 600 });

    expect(avisos).toEqual([]);
  });

  it('el exceso de IVA sobre la tolerancia se rechaza, tenga o no agotado el total', () => {
    const agotando = () =>
      exigirQueLaNotaNoSupereLaFactura(conUnaNota(), { tipo: 'nota_de_credito', total: 5000, iva: 541 });
    const sinAgotar = () =>
      exigirQueLaNotaNoSupereLaFactura(conUnaNota(), { tipo: 'nota_de_credito', total: 1000, iva: 541 });

    expect(agotando).toThrow(NotaExcedeLaFactura);
    expect(sinAgotar).toThrow(NotaExcedeLaFactura);
  });

  it('la tolerancia crece con las notas de crédito vigentes: un centavo por nota, mínimo Q0.05', () => {
    const conSeis = conNotas({
      total: 100000,
      iva: 10714,
      totalDeNotasDeCredito: 60000,
      ivaDeNotasDeCredito: 10714 + 6,
      cantidadDeNotasDeCredito: 6,
    });
    const nota = (iva: number) => ({ tipo: 'nota_de_credito' as const, total: 1000, iva });

    expect(() => exigirQueLaNotaNoSupereLaFactura(conSeis, nota(1))).not.toThrow();
    expect(() => exigirQueLaNotaNoSupereLaFactura(conSeis, nota(2))).toThrow(NotaExcedeLaFactura);
  });

  it('una factura mixta admite la nota que devuelve solo lo gravado, sin prorratear el IVA', () => {
    const mixta = conNotas({ total: 21200, iva: 1200 });

    const avisos = exigirQueLaNotaNoSupereLaFactura(mixta, { tipo: 'nota_de_credito', total: 11200, iva: 1200 });

    expect(avisos).toEqual([]);
  });

  it('las notas de débito vigentes suben el tope', () => {
    const factura = conNotas({ totalDeNotasDeDebito: 1120, ivaDeNotasDeDebito: 120 });

    expect(() =>
      exigirQueLaNotaNoSupereLaFactura(factura, { tipo: 'nota_de_credito', total: 12320, iva: 1320 }),
    ).not.toThrow();
  });

  it('el IVA también tiene tope', () => {
    const intento = () =>
      exigirQueLaNotaNoSupereLaFactura(conNotas(), { tipo: 'nota_de_credito', total: 1000, iva: 1206 });

    expect(intento).toThrow(NotaExcedeLaFactura);
  });

  it('la nota de débito y la de abono no tienen tope', () => {
    expect(() =>
      exigirQueLaNotaNoSupereLaFactura(conNotas(), { tipo: 'nota_de_debito', total: 99999, iva: 9999 }),
    ).not.toThrow();
    expect(() =>
      exigirQueLaNotaNoSupereLaFactura(conNotas(), { tipo: 'nota_de_abono', total: 99999, iva: 0 }),
    ).not.toThrow();
  });
});

describe('avisos de la nota', () => {
  it('la nota de crédito vence la víspera de los dos meses de su factura', () => {
    expect(esNotaDeCreditoTardia('2026-05-14', '2026-03-15')).toBe(false);
    expect(esNotaDeCreditoTardia('2026-05-15', '2026-03-15')).toBe(true);
  });

  it('avisa de la nota de crédito tardía, sin bloquear', () => {
    expect(avisosDeLaNota({ tipo: 'nota_de_credito', fechaEmision: '2026-05-15' }, '2026-03-15')).toEqual([
      AVISO_DE_NOTA_DE_CREDITO_TARDIA,
    ]);
    expect(avisosDeLaNota({ tipo: 'nota_de_credito', fechaEmision: '2026-04-01' }, '2026-03-15')).toEqual([]);
  });

  it('la nota de abono siempre avisa que no rebaja el IVA', () => {
    expect(avisosDeLaNota({ tipo: 'nota_de_abono', fechaEmision: '2026-03-16' }, '2026-03-15')).toEqual([
      AVISO_DE_NOTA_DE_ABONO,
    ]);
  });

  it('la nota de débito no avisa del plazo', () => {
    expect(avisosDeLaNota({ tipo: 'nota_de_debito', fechaEmision: '2027-01-01' }, '2026-03-15')).toEqual([]);
  });
});
