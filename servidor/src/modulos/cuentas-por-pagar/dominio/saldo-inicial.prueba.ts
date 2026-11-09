import { describe, expect, it } from 'vitest';
import { VencimientoInvalido } from './errores.js';
import {
  EmisionNoAnteriorAlInicio,
  NumeroDeDocumentoInvalido,
  ReferenciaInvalida,
  RetencionesInvalidas,
  RetencionesPorPracticarInvalidas,
  SaldoPendienteInvalido,
  TotalInvalido,
} from './errores-de-saldos-iniciales.js';
import {
  limpiarNumero,
  limpiarReferencia,
  limpiarSerie,
  prepararSaldoInicial,
  type DatosDeSaldoInicial,
} from './saldo-inicial.js';

const INICIO = '2026-01-01';

function datos(cambios: Partial<DatosDeSaldoInicial> = {}): DatosDeSaldoInicial {
  return {
    proveedorId: crypto.randomUUID(),
    tipo: 'factura',
    serie: 'a',
    numero: '123',
    fechaEmision: '2025-12-20',
    vencimiento: null,
    totalCentavos: 112000,
    retencionesCentavos: 0,
    retencionesPorPracticarCentavos: 0,
    saldoPendienteCentavos: 112000,
    referencia: null,
    tieneActivoFijo: false,
    ...cambios,
  };
}

describe('la emisión de un saldo inicial', () => {
  it('es estrictamente anterior a la fecha de inicio', () => {
    expect(prepararSaldoInicial(datos({ fechaEmision: '2025-12-31' }), INICIO).fechaEmision).toBe('2025-12-31');
    expect(() => prepararSaldoInicial(datos({ fechaEmision: INICIO }), INICIO)).toThrow(EmisionNoAnteriorAlInicio);
    expect(() => prepararSaldoInicial(datos({ fechaEmision: '2026-02-01' }), INICIO)).toThrow(
      EmisionNoAnteriorAlInicio,
    );
  });

  it('el mensaje dice la fecha de inicio como dd/mm/aaaa', () => {
    expect(() => prepararSaldoInicial(datos({ fechaEmision: INICIO }), INICIO)).toThrow('(01/01/2026)');
  });
});

describe('serie, número y referencia', () => {
  it('se limpian como en Libro de compras: sin espacios y en mayúsculas', () => {
    expect(limpiarSerie(' a b ')).toBe('AB');
    expect(limpiarSerie('   ')).toBeNull();
    expect(limpiarSerie(null)).toBeNull();
    expect(limpiarNumero(' 12 34 ')).toBe('1234');
  });

  it('el número es obligatorio y ni la serie ni el número pasan de 40', () => {
    expect(() => limpiarNumero('   ')).toThrow(NumeroDeDocumentoInvalido);
    expect(() => limpiarNumero('9'.repeat(41))).toThrow(NumeroDeDocumentoInvalido);
    expect(() => limpiarSerie('A'.repeat(41))).toThrow(NumeroDeDocumentoInvalido);
    expect(limpiarNumero('9'.repeat(40))).toHaveLength(40);
  });

  it('la referencia se recorta, vacía es nula y no pasa de 60', () => {
    expect(limpiarReferencia('  Póliza 2025-12-0345 línea 12  ')).toBe('Póliza 2025-12-0345 línea 12');
    expect(limpiarReferencia('   ')).toBeNull();
    expect(limpiarReferencia(null)).toBeNull();
    expect(limpiarReferencia('x'.repeat(60))).toHaveLength(60);
    expect(() => limpiarReferencia('x'.repeat(61))).toThrow(ReferenciaInvalida);
  });

  it('prepararSaldoInicial devuelve los datos ya limpios', () => {
    const limpio = prepararSaldoInicial(datos({ serie: ' s ', numero: '1 2', referencia: ' CXP-1 ' }), INICIO);

    expect(limpio).toMatchObject({ serie: 'S', numero: '12', referencia: 'CXP-1' });
  });
});

describe('los montos de un saldo inicial', () => {
  it('el total es mayor que cero', () => {
    expect(() => prepararSaldoInicial(datos({ totalCentavos: 0 }), INICIO)).toThrow(TotalInvalido);
    expect(() => prepararSaldoInicial(datos({ totalCentavos: Number.NaN }), INICIO)).toThrow(TotalInvalido);
  });

  it('las retenciones van de cero al total', () => {
    const conRetenciones = datos({ retencionesCentavos: 10000, saldoPendienteCentavos: 102000 });
    expect(prepararSaldoInicial(conRetenciones, INICIO).retencionesCentavos).toBe(10000);
    expect(() => prepararSaldoInicial(datos({ retencionesCentavos: 112001 }), INICIO)).toThrow(RetencionesInvalidas);
    expect(() => prepararSaldoInicial(datos({ retencionesCentavos: -1 }), INICIO)).toThrow(RetencionesInvalidas);
  });

  it('una nota de crédito no lleva retenciones', () => {
    const nota = datos({ tipo: 'nota_de_credito', retencionesCentavos: 100, saldoPendienteCentavos: 1000 });

    expect(() => prepararSaldoInicial(nota, INICIO)).toThrow(RetencionesInvalidas);
  });

  it('el saldo pendiente es mayor que cero y no pasa del total menos las retenciones', () => {
    const base = { retencionesCentavos: 12000 };
    expect(prepararSaldoInicial(datos({ ...base, saldoPendienteCentavos: 100000 }), INICIO)).toBeDefined();
    expect(prepararSaldoInicial(datos({ ...base, saldoPendienteCentavos: 1 }), INICIO)).toBeDefined();
    expect(() => prepararSaldoInicial(datos({ ...base, saldoPendienteCentavos: 100001 }), INICIO)).toThrow(
      SaldoPendienteInvalido,
    );
    expect(() => prepararSaldoInicial(datos({ saldoPendienteCentavos: 0 }), INICIO)).toThrow(SaldoPendienteInvalido);
  });

  it('el mensaje del saldo pendiente dice el máximo en quetzales', () => {
    const exceso = datos({ retencionesCentavos: 12000, saldoPendienteCentavos: 112000 });

    expect(() => prepararSaldoInicial(exceso, INICIO)).toThrow('(Q1000.00)');
  });

  it('las retenciones por practicar son parte de las retenciones y no cambian el saldo pendiente', () => {
    const parcial = datos({
      retencionesCentavos: 12000,
      retencionesPorPracticarCentavos: 5000,
      saldoPendienteCentavos: 100000,
    });
    expect(prepararSaldoInicial(parcial, INICIO)).toMatchObject({
      retencionesPorPracticarCentavos: 5000,
      saldoPendienteCentavos: 100000,
    });
    const demasiado = datos({
      retencionesCentavos: 12000,
      retencionesPorPracticarCentavos: 12001,
      saldoPendienteCentavos: 100000,
    });
    expect(() => prepararSaldoInicial(demasiado, INICIO)).toThrow(RetencionesPorPracticarInvalidas);
    expect(() => prepararSaldoInicial(datos({ retencionesPorPracticarCentavos: 1 }), INICIO)).toThrow(
      RetencionesPorPracticarInvalidas,
    );
  });
});

describe('el vencimiento de un saldo inicial', () => {
  it('puede ser anterior a la fecha de inicio (ya venció) y se deja nulo si no se escribe', () => {
    expect(prepararSaldoInicial(datos({ vencimiento: '2025-12-25' }), INICIO).vencimiento).toBe('2025-12-25');
    expect(prepararSaldoInicial(datos({ vencimiento: null }), INICIO).vencimiento).toBeNull();
  });

  it('no puede ser anterior a la emisión', () => {
    expect(() => prepararSaldoInicial(datos({ vencimiento: '2025-12-19' }), INICIO)).toThrow(VencimientoInvalido);
  });

  it('una nota de crédito no vence', () => {
    const nota = datos({ tipo: 'nota_de_credito', vencimiento: '2026-02-01', saldoPendienteCentavos: 1000 });

    expect(() => prepararSaldoInicial(nota, INICIO)).toThrow(VencimientoInvalido);
  });
});
