import { describe, expect, it } from 'vitest';
import type { ConceptoDeGasto } from '../../servicios/conceptos-de-gasto.api';
import {
  ajustarTipoDeLinea,
  aplicarConcepto,
  lineaCompleta,
  lineaParaElCuerpo,
  lineaVacia,
  montoEnTexto,
  sumaDeLineas,
} from './lineas-del-documento';

const concepto = (cambios: Partial<ConceptoDeGasto> = {}): ConceptoDeGasto => ({
  id: 'c-1',
  nombre: 'Insumos',
  tipoPorOmision: 'bien',
  esProductoAgropecuario: false,
  esActivoFijo: false,
  activo: true,
  ...cambios,
});

describe('montoEnTexto', () => {
  it('da el formato de la API con los decimales pedidos', () => {
    expect(montoEnTexto(12.5)).toBe('12.50');
    expect(montoEnTexto('1250')).toBe('1250.00');
    expect(montoEnTexto('3', 3)).toBe('3.000');
  });

  it('acepta la coma decimal', () => {
    expect(montoEnTexto('12,5')).toBe('12.50');
  });

  it('lo vacío o que no es número queda en null', () => {
    expect(montoEnTexto('')).toBeNull();
    expect(montoEnTexto('  ')).toBeNull();
    expect(montoEnTexto(null)).toBeNull();
    expect(montoEnTexto('abc')).toBeNull();
  });
});

describe('aplicarConcepto', () => {
  it('propone el tipo y el activo fijo del concepto', () => {
    const linea = lineaVacia();
    aplicarConcepto(linea, concepto({ tipoPorOmision: 'servicio' }));
    expect(linea).toMatchObject({ tipo: 'servicio', esActivoFijo: false });
    aplicarConcepto(linea, concepto({ esActivoFijo: true }));
    expect(linea).toMatchObject({ tipo: 'bien', esActivoFijo: true });
  });

  it('sin concepto no cambia nada', () => {
    const linea = lineaVacia();
    aplicarConcepto(linea, undefined);
    expect(linea.tipo).toBe('bien');
  });
});

describe('ajustarTipoDeLinea', () => {
  it('un activo fijo o el combustible siempre son un bien', () => {
    const linea = { ...lineaVacia(), tipo: 'servicio' as const, esActivoFijo: true };
    ajustarTipoDeLinea(linea);
    expect(linea.tipo).toBe('bien');
  });

  it('sin combustible se borran el combustible y los galones', () => {
    const linea = { ...lineaVacia(), esCombustible: false, combustibleId: 'g-1', galones: 10 };
    ajustarTipoDeLinea(linea);
    expect(linea).toMatchObject({ combustibleId: null, galones: '' });
  });
});

describe('lineaCompleta y lineaParaElCuerpo', () => {
  it('pide concepto y total', () => {
    expect(lineaCompleta({ ...lineaVacia(), conceptoId: 'c-1' })).toBe(false);
    expect(lineaCompleta({ ...lineaVacia(), total: 10 })).toBe(false);
    expect(lineaCompleta({ ...lineaVacia(), conceptoId: 'c-1', total: 10 })).toBe(true);
  });

  it('el combustible pide además el combustible y los galones', () => {
    const base = { ...lineaVacia(), conceptoId: 'c-1', total: 100, esCombustible: true };
    expect(lineaCompleta(base)).toBe(false);
    expect(lineaCompleta({ ...base, combustibleId: 'g-1' })).toBe(false);
    expect(lineaCompleta({ ...base, combustibleId: 'g-1', galones: '8,5' })).toBe(true);
  });

  it('el cuerpo lleva los galones con tres decimales y el exento solo si se escribió', () => {
    const linea = {
      ...lineaVacia(),
      conceptoId: 'c-1',
      total: '100',
      exento: '20',
      esCombustible: true,
      combustibleId: 'g-1',
      galones: '8,5',
    };
    expect(lineaParaElCuerpo(linea)).toEqual({
      conceptoId: 'c-1',
      descripcion: null,
      tipo: 'bien',
      esActivoFijo: false,
      combustibleId: 'g-1',
      galones: '8.500',
      total: '100.00',
      exento: '20.00',
    });
  });

  it('una línea incompleta no tiene cuerpo', () => {
    expect(lineaParaElCuerpo(lineaVacia())).toBeNull();
  });
});

describe('sumaDeLineas', () => {
  it('suma lo tecleado sin errores de redondeo', () => {
    const lineas = [{ ...lineaVacia(), total: '0.10' }, { ...lineaVacia(), total: 0.2 }, lineaVacia()];
    expect(sumaDeLineas(lineas)).toBe('0.30');
  });
});
