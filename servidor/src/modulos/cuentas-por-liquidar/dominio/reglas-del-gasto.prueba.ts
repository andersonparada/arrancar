import { describe, expect, it } from 'vitest';
import { avisoDeFueraDelLibro, avisoDeRetencionEnLaBandeja } from './avisos-de-gastos.js';
import {
  FechaDelGastoInvalida,
  MontoDelGastoInvalido,
  MotivoConRetencionNoAplica,
  MotivoConRetencionObligatorio,
  RentaDelTrabajoSoloEmpleados,
  TextoDelGastoInvalido,
} from './errores-de-gastos.js';
import { montoDeLoPagado, totalPagadoDelGasto } from './gastos.js';
import {
  etiquetaDelDocumento,
  exigirFechaDelGasto,
  exigirMontoDelGasto,
  fechaDeQuitarElGasto,
  motivoDeLaRetencion,
  textoDelGasto,
  tratamientoDelGastoSinDocumento,
} from './reglas-del-gasto.js';

const conRetencion = { conRetencion: true, montoRetenidoCentavos: 9000 };
const sinRetencion = { conRetencion: false, montoRetenidoCentavos: 0 };

describe('lo que salió del anticipo', () => {
  it('es el total menos la retención, y lo pagado al proveedor lo suma de nuevo', () => {
    expect(montoDeLoPagado(560_000, 9_000)).toBe(551_000);
    expect(totalPagadoDelGasto({ montoCentavos: 551_000, montoRetenidoCentavos: 9_000 })).toBe(560_000);
  });
});

describe('fecha del gasto', () => {
  const limites = { entrega: '2026-11-10', hoy: '2026-11-18' };

  it('acepta desde la entrega hasta hoy', () => {
    expect(() => exigirFechaDelGasto('2026-11-10', limites)).not.toThrow();
    expect(() => exigirFechaDelGasto('2026-11-18', limites)).not.toThrow();
  });

  it('rechaza una fecha futura o anterior a la entrega', () => {
    expect(() => exigirFechaDelGasto('2026-11-19', limites)).toThrow(FechaDelGastoInvalida);
    expect(() => exigirFechaDelGasto('2026-11-09', limites)).toThrow('anterior a la entrega del anticipo (10/11/2026)');
  });

  it('al quitar, la fecha contable es hoy y nunca antes del gasto', () => {
    expect(fechaDeQuitarElGasto({ fecha: '2026-11-12' }, '2026-11-18')).toBe('2026-11-18');
    expect(fechaDeQuitarElGasto({ fecha: '2026-11-20' }, '2026-11-18')).toBe('2026-11-20');
  });
});

describe('motivo de la excepción de retención', () => {
  it('con retención pide el motivo y lo devuelve recortado', () => {
    expect(motivoDeLaRetencion({ gasto: conRetencion, etiqueta: 'A-1', motivo: '  Urgente  ' })).toBe('Urgente');
    expect(() => motivoDeLaRetencion({ gasto: conRetencion, etiqueta: 'A-1', motivo: '   ' })).toThrow(
      MotivoConRetencionObligatorio,
    );
    expect(() => motivoDeLaRetencion({ gasto: conRetencion, etiqueta: 'A-1' })).toThrow(MotivoConRetencionObligatorio);
    expect(() => motivoDeLaRetencion({ gasto: conRetencion, etiqueta: 'A-1', motivo: 'x'.repeat(301) })).toThrow(
      MotivoConRetencionObligatorio,
    );
  });

  it('sin retención no hay motivo, y uno escrito se rechaza en vez de guardarse', () => {
    expect(motivoDeLaRetencion({ gasto: sinRetencion, etiqueta: 'A-1' })).toBeNull();
    expect(motivoDeLaRetencion({ gasto: sinRetencion, etiqueta: 'A-1', motivo: '  ' })).toBeNull();
    expect(() => motivoDeLaRetencion({ gasto: sinRetencion, etiqueta: 'A-1', motivo: 'Por si acaso' })).toThrow(
      MotivoConRetencionNoAplica,
    );
  });
});

describe('gasto sin documento', () => {
  it('el monto debe ser mayor que cero', () => {
    expect(exigirMontoDelGasto(100)).toBe(100);
    expect(() => exigirMontoDelGasto(0)).toThrow(MontoDelGastoInvalido);
  });

  it('los textos van escritos y dentro de su tope', () => {
    const regla = { campo: 'pagadoA', nombre: 'a quién se le pagó', maximo: 10 };
    expect(textoDelGasto('  Taxista ', regla)).toBe('Taxista');
    expect(() => textoDelGasto('   ', regla)).toThrow(TextoDelGastoInvalido);
    expect(() => textoDelGasto('x'.repeat(11), regla)).toThrow('hasta 10 letras');
  });

  it('por omisión es no deducible y la renta del trabajo solo cabe en un empleado', () => {
    expect(tratamientoDelGastoSinDocumento(undefined, false)).toBe('no_deducible');
    expect(tratamientoDelGastoSinDocumento('renta_del_trabajo', true)).toBe('renta_del_trabajo');
    expect(() => tratamientoDelGastoSinDocumento('renta_del_trabajo', false)).toThrow(RentaDelTrabajoSoloEmpleados);
  });
});

describe('textos de los documentos', () => {
  it('la etiqueta lleva la serie si la tiene', () => {
    expect(etiquetaDelDocumento({ serie: 'A', numero: '15' })).toBe('A-15');
    expect(etiquetaDelDocumento({ serie: null, numero: '15' })).toBe('15');
  });

  it('el aviso de fuera del libro dice por qué y no sale si va en el libro', () => {
    expect(avisoDeFueraDelLibro(null)).toBeNull();
    expect(avisoDeFueraDelLibro('sin_fel')).toBe(
      'No da crédito fiscal ni es deducible: no tiene factura electrónica (FEL).',
    );
  });

  it('el aviso de retención en la bandeja nombra el monto y cómo asignarla', () => {
    const aviso = avisoDeRetencionEnLaBandeja(9_000);

    expect(aviso).toContain('Q90.00');
    expect(aviso).toContain('permiso de excepción');
  });
});
