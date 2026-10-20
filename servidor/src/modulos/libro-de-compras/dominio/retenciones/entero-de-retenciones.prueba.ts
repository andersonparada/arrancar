import { describe, expect, it } from 'vitest';
import { enteroValido, mesDelEnteroValido, motivoDeAnulacionDelEnteroValido } from './entero-de-retenciones.js';
import {
  DocumentoDePagoInvalido,
  FechaDePagoInvalida,
  GrupoDeEnteroInvalido,
  MesDelEnteroInvalido,
  MontoDelEnteroInvalido,
  MotivoDeAnulacionDelEnteroInvalido,
  ObservacionesDelEnteroInvalidas,
} from './errores-de-retenciones.js';

const peticion = (cambios: Record<string, unknown> = {}) => ({
  mes: '2026-09',
  grupo: 'iva_agentes',
  fechaDePago: '2026-10-15',
  documentoDePago: ' sat 2046 ',
  monto: 12550,
  observaciones: null,
  ...cambios,
});

describe('entero de retenciones', () => {
  it('lleva el mes a su primer día, el formulario en mayúsculas y sin espacios', () => {
    expect(enteroValido(peticion())).toEqual({
      mes: '2026-09-01',
      grupo: 'iva_agentes',
      fechaDePago: '2026-10-15',
      documentoDePago: 'SAT2046',
      monto: 12550,
      observaciones: null,
    });
  });

  it('acepta el mes con su día uno y rechaza otro día', () => {
    expect(mesDelEnteroValido('2026-09-01')).toBe('2026-09-01');
    expect(() => mesDelEnteroValido('2026-09-15')).toThrow(MesDelEnteroInvalido);
    expect(() => mesDelEnteroValido('2026-13')).toThrow(MesDelEnteroInvalido);
  });

  it('rechaza un grupo desconocido, un monto en cero o decimal, y una fecha anterior al mes', () => {
    expect(() => enteroValido(peticion({ grupo: 'otro' }))).toThrow(GrupoDeEnteroInvalido);
    expect(() => enteroValido(peticion({ monto: 0 }))).toThrow(MontoDelEnteroInvalido);
    expect(() => enteroValido(peticion({ monto: 10.5 }))).toThrow(MontoDelEnteroInvalido);
    expect(() => enteroValido(peticion({ fechaDePago: '2026-08-31' }))).toThrow(FechaDePagoInvalida);
  });

  it('exige el formulario o la boleta de 1 a 40 caracteres y observaciones de hasta 300', () => {
    expect(() => enteroValido(peticion({ documentoDePago: '  ' }))).toThrow(DocumentoDePagoInvalido);
    expect(() => enteroValido(peticion({ documentoDePago: 'A'.repeat(41) }))).toThrow(DocumentoDePagoInvalido);
    expect(() => enteroValido(peticion({ observaciones: 'x'.repeat(301) }))).toThrow(ObservacionesDelEnteroInvalidas);
    expect(enteroValido(peticion({ observaciones: '  ' })).observaciones).toBeNull();
  });

  it('anular exige el motivo', () => {
    expect(motivoDeAnulacionDelEnteroValido(' Error de captura ')).toBe('Error de captura');
    expect(() => motivoDeAnulacionDelEnteroValido('')).toThrow(MotivoDeAnulacionDelEnteroInvalido);
  });
});
