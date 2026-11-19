import { describe, expect, it } from 'vitest';
import {
  LineaDescartada,
  LineaNoCapitalizable,
  LineaSobrecapitalizada,
  MontoDeCostoInvalido,
} from './errores-de-costo.js';
import {
  claseDeCostoDeLinea,
  costoFirmado,
  exigirCapacidadDeLinea,
  exigirCapitalizable,
  exigirSignoDeLinea,
  pendienteFirmado,
  type LineaCapitalizable,
} from './linea-capitalizable.js';

const linea = (cambios: Partial<LineaCapitalizable> = {}): LineaCapitalizable => ({
  lineaId: crypto.randomUUID(),
  documentoId: crypto.randomUUID(),
  tipoDeDocumento: 'factura',
  documentoVigente: true,
  fechaEmision: '2026-11-01',
  esActivoFijo: true,
  costoCentavos: 100_000,
  descartada: false,
  facturaCapitalizada: false,
  capitalizadoCentavos: 0,
  ...cambios,
});

const nota = (cambios: Partial<LineaCapitalizable> = {}) => linea({ tipoDeDocumento: 'nota_de_credito', ...cambios });

describe('costo de la línea con signo', () => {
  it('la factura suma y la nota de crédito resta', () => {
    expect(costoFirmado(linea())).toBe(100_000);
    expect(costoFirmado(nota())).toBe(-100_000);
  });

  it('el pendiente descuenta lo ya capitalizado', () => {
    expect(pendienteFirmado(linea({ capitalizadoCentavos: 30_000 }))).toBe(70_000);
    expect(pendienteFirmado(nota({ capitalizadoCentavos: -30_000 }))).toBe(-70_000);
  });
});

describe('qué línea se puede capitalizar', () => {
  it('una línea marcada como activo fijo de un documento vigente', () => {
    expect(() => exigirCapitalizable(linea())).not.toThrow();
  });

  it('una línea sin la marca no, salvo la de una nota de crédito de una factura capitalizada', () => {
    expect(() => exigirCapitalizable(linea({ esActivoFijo: false }))).toThrow(LineaNoCapitalizable);
    expect(() => exigirCapitalizable(nota({ esActivoFijo: false }))).toThrow(LineaNoCapitalizable);
    expect(() => exigirCapitalizable(nota({ esActivoFijo: false, facturaCapitalizada: true }))).not.toThrow();
  });

  it('un documento anulado no', () => {
    expect(() => exigirCapitalizable(linea({ documentoVigente: false }))).toThrow(LineaNoCapitalizable);
  });

  it('una línea descartada espera a que la devuelvan a la bandeja', () => {
    expect(() => exigirCapitalizable(linea({ descartada: true }))).toThrow(LineaDescartada);
  });
});

describe('clase de costo', () => {
  it('las notas fijan la suya y en las demás se elige (adquisición por omisión)', () => {
    expect(claseDeCostoDeLinea(nota(), 'flete')).toBe('nota_de_credito');
    expect(claseDeCostoDeLinea(linea({ tipoDeDocumento: 'nota_de_debito' }), null)).toBe('nota_de_debito');
    expect(claseDeCostoDeLinea(linea(), 'flete')).toBe('flete');
    expect(claseDeCostoDeLinea(linea(), null)).toBe('adquisicion');
  });
});

describe('signo del monto', () => {
  it('debe ser el de la línea y distinto de cero', () => {
    expect(() => exigirSignoDeLinea(linea(), 5_000)).not.toThrow();
    expect(() => exigirSignoDeLinea(nota(), -5_000)).not.toThrow();
    expect(() => exigirSignoDeLinea(linea(), -5_000)).toThrow(MontoDeCostoInvalido);
    expect(() => exigirSignoDeLinea(nota(), 5_000)).toThrow(MontoDeCostoInvalido);
    expect(() => exigirSignoDeLinea(linea(), 0)).toThrow(MontoDeCostoInvalido);
  });
});

describe('la regla de la línea', () => {
  it('lo capitalizado más lo nuevo puede llegar al costo pero no pasarlo', () => {
    const parcial = linea({ capitalizadoCentavos: 60_000 });

    expect(() => exigirCapacidadDeLinea(parcial, 40_000)).not.toThrow();
    expect(() => exigirCapacidadDeLinea(parcial, 40_001)).toThrow(LineaSobrecapitalizada);
  });

  it('en una nota de crédito, la suma negativa no baja de su costo negativo', () => {
    const parcial = nota({ capitalizadoCentavos: -60_000 });

    expect(() => exigirCapacidadDeLinea(parcial, -40_000)).not.toThrow();
    expect(() => exigirCapacidadDeLinea(parcial, -40_001)).toThrow(LineaSobrecapitalizada);
  });

  it('el error dice cuánto quedaba pendiente', () => {
    const error = (() => {
      try {
        exigirCapacidadDeLinea(linea({ capitalizadoCentavos: 90_000 }), 20_000);
      } catch (e) {
        return e as LineaSobrecapitalizada;
      }
    })();

    expect(error?.detalles).toEqual({ pendienteCentavos: 10_000 });
  });
});
