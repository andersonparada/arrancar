import { describe, expect, it } from 'vitest';
import {
  avisoDeFechaDePago,
  totalDelEntero,
  enteroValido,
  mesDelEnteroValido,
  motivoDeAnulacionDelEnteroValido,
} from './entero-de-retenciones.js';
import {
  AccesorioDelEnteroInvalido,
  DocumentoDePagoInvalido,
  FechaDePagoFutura,
  FechaDePagoInvalida,
  GrupoDeEnteroInvalido,
  MesDelEnteroInvalido,
  ImpuestoDelEnteroInvalido,
  MotivoDeAnulacionDelEnteroInvalido,
  ObservacionesDelEnteroInvalidas,
} from './errores-de-retenciones.js';

const HOY = '2026-10-20';

const peticion = (cambios: Record<string, unknown> = {}) => ({
  mes: '2026-09',
  grupo: 'iva_agentes',
  fechaDePago: '2026-10-15',
  documentoDePago: ' Boleta 2046 ',
  impuesto: 12550,
  observaciones: null,
  ...cambios,
});

describe('entero de retenciones', () => {
  it('lleva el mes a su primer día, el formulario tal como se escribió (solo sin espacios en los extremos)', () => {
    expect(enteroValido(peticion(), HOY)).toEqual({
      mes: '2026-09-01',
      grupo: 'iva_agentes',
      fechaDePago: '2026-10-15',
      documentoDePago: 'Boleta 2046',
      impuesto: 12550,
      multa: 0,
      intereses: 0,
      mora: 0,
      observaciones: null,
    });
  });

  it('acepta el mes con su día uno y rechaza otro día', () => {
    expect(mesDelEnteroValido('2026-09-01')).toBe('2026-09-01');
    expect(() => mesDelEnteroValido('2026-09-15')).toThrow(MesDelEnteroInvalido);
    expect(() => mesDelEnteroValido('2026-13')).toThrow(MesDelEnteroInvalido);
  });

  it('rechaza un grupo desconocido, un impuesto en cero o decimal, y una fecha anterior al mes', () => {
    expect(() => enteroValido(peticion({ grupo: 'otro' }), HOY)).toThrow(GrupoDeEnteroInvalido);
    expect(() => enteroValido(peticion({ impuesto: 0 }), HOY)).toThrow(ImpuestoDelEnteroInvalido);
    expect(() => enteroValido(peticion({ impuesto: 10.5 }), HOY)).toThrow(ImpuestoDelEnteroInvalido);
    expect(() => enteroValido(peticion({ fechaDePago: '2026-08-31' }), HOY)).toThrow(FechaDePagoInvalida);
  });

  it('la fecha de pago puede ser la de hoy, pero no una posterior', () => {
    expect(enteroValido(peticion({ fechaDePago: HOY }), HOY).fechaDePago).toBe(HOY);
    const manana = () => enteroValido(peticion({ fechaDePago: '2026-10-21' }), HOY);
    expect(manana).toThrow(FechaDePagoFutura);
    expect(manana).toThrow('La fecha de pago no puede ser posterior a hoy (20/10/2026)');
  });

  it('avisa si el pago es anterior al cierre del mes, pero no el último día ni después', () => {
    const aviso = avisoDeFechaDePago({ mes: '2026-03-01', fechaDePago: '2026-03-15' });
    expect(aviso).toContain(
      'La fecha de pago (15/03/2026) es anterior al cierre del mes de las retenciones (31/03/2026)',
    );
    expect(avisoDeFechaDePago({ mes: '2026-03-01', fechaDePago: '2026-03-31' })).toBeNull();
    expect(avisoDeFechaDePago({ mes: '2026-03-01', fechaDePago: '2026-04-20' })).toBeNull();
  });

  it('los accesorios valen cero si no se escriben y el total suma impuesto, multa, intereses y mora', () => {
    const sin = enteroValido(peticion(), HOY);
    const con = enteroValido(peticion({ impuesto: 18000, multa: 5000, intereses: 510, mora: 100 }), HOY);

    expect([sin.multa, sin.intereses, sin.mora]).toEqual([0, 0, 0]);
    expect(totalDelEntero(sin)).toBe(12550);
    expect(totalDelEntero(con)).toBe(23610);
  });

  it.each(['multa', 'intereses', 'mora'])('rechaza %s negativa o con decimales y dice el campo', (campo) => {
    const negativo = () => enteroValido(peticion({ [campo]: -1 }), HOY);
    const decimal = () => enteroValido(peticion({ [campo]: 10.5 }), HOY);

    expect(negativo).toThrow(AccesorioDelEnteroInvalido);
    expect(negativo).toThrow('La multa, los intereses y la mora no pueden ser negativos.');
    expect(decimal).toThrow(AccesorioDelEnteroInvalido);
    try {
      negativo();
    } catch (error) {
      expect((error as AccesorioDelEnteroInvalido).detalles).toEqual({ campo });
    }
  });

  it('exige el formulario o la boleta de 1 a 40 caracteres y observaciones de hasta 300', () => {
    expect(() => enteroValido(peticion({ documentoDePago: '  ' }), HOY)).toThrow(DocumentoDePagoInvalido);
    expect(() => enteroValido(peticion({ documentoDePago: 'A'.repeat(41) }), HOY)).toThrow(DocumentoDePagoInvalido);
    expect(() => enteroValido(peticion({ observaciones: 'x'.repeat(301) }), HOY)).toThrow(
      ObservacionesDelEnteroInvalidas,
    );
    expect(enteroValido(peticion({ observaciones: '  ' }), HOY).observaciones).toBeNull();
  });

  it('anular exige el motivo', () => {
    expect(motivoDeAnulacionDelEnteroValido(' Error de captura ')).toBe('Error de captura');
    expect(() => motivoDeAnulacionDelEnteroValido('')).toThrow(MotivoDeAnulacionDelEnteroInvalido);
  });
});
