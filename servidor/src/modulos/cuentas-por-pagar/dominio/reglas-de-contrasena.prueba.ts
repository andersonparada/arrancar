import { describe, expect, it } from 'vitest';
import { numeroDeContrasena, proponerFechaDePago } from './contrasena.js';
import {
  ContrasenaSinCargos,
  DemasiadosDocumentosEnContrasena,
  DocumentoDeOtroProveedor,
  DocumentoNoDisponibleParaContrasena,
  DocumentosRepetidosEnContrasena,
  DocumentoYaEnContrasena,
  FechaDeContrasenaInvalida,
  FechaDePagoInvalida,
  ObservacionesDeContrasenaInvalidas,
} from './errores-de-contrasenas.js';
import type { DocumentoPorPagar } from './documento-por-pagar.js';
import {
  exigirAlMenosUnCargo,
  exigirDocumentoDisponible,
  exigirDocumentosPedidos,
  exigirFechaDeContrasena,
  exigirFechaDePago,
  observacionesDeContrasena,
} from './reglas-de-contrasena.js';

const documento = (cambios: Partial<DocumentoPorPagar> = {}) =>
  ({
    id: 'd',
    serie: 'A',
    numero: '1',
    tipo: 'factura',
    estado: 'registrado',
    proveedorId: 'p',
    ...cambios,
  }) as DocumentoPorPagar;

describe('el número de la contraseña', () => {
  it('sin reinicio anual es solo el correlativo; con reinicio lleva el año', () => {
    expect(numeroDeContrasena(15, 0)).toBe('15');
    expect(numeroDeContrasena(15, 2026)).toBe('2026-15');
  });
});

describe('los documentos pedidos', () => {
  it('piden de uno a cien y sin repetir', () => {
    expect(() => exigirDocumentosPedidos([])).toThrow(ContrasenaSinCargos);
    expect(() => exigirDocumentosPedidos(Array.from({ length: 101 }, (_, i) => String(i)))).toThrow(
      DemasiadosDocumentosEnContrasena,
    );
    expect(() => exigirDocumentosPedidos(['a', 'a'])).toThrow(DocumentosRepetidosEnContrasena);
    expect(() => exigirDocumentosPedidos(Array.from({ length: 100 }, (_, i) => String(i)))).not.toThrow();
  });
});

describe('un documento disponible', () => {
  const validar = (cambios: Partial<DocumentoPorPagar>, saldoCentavos = 100, otra: string | null = null) =>
    exigirDocumentoDisponible({ documento: documento(cambios), saldoCentavos }, 'p', otra);

  it('acepta un cargo con saldo, también pendiente', () => {
    expect(() => validar({})).not.toThrow();
    expect(() => validar({ estado: 'pendiente' })).not.toThrow();
  });

  it('rechaza otro proveedor, anulado, en otra contraseña y sin saldo', () => {
    expect(() => validar({ proveedorId: 'otro' })).toThrow(DocumentoDeOtroProveedor);
    expect(() => validar({ estado: 'anulado' })).toThrow(DocumentoNoDisponibleParaContrasena);
    expect(() => validar({}, 100, '15')).toThrow(/contraseña 15/);
    expect(() => validar({}, 100, '15')).toThrow(DocumentoYaEnContrasena);
    expect(() => validar({}, 0)).toThrow(/ya no debe nada/);
    expect(() => validar({ tipo: 'nota_de_credito' }, 0)).toThrow(/no tiene saldo a favor/);
  });
});

describe('al menos un cargo', () => {
  it('una nota sola no alcanza', () => {
    expect(() => exigirAlMenosUnCargo([documento({ tipo: 'nota_de_credito' })])).toThrow(ContrasenaSinCargos);
    expect(() => exigirAlMenosUnCargo([documento({ tipo: 'nota_de_credito' }), documento()])).not.toThrow();
  });
});

describe('la fecha de la contraseña', () => {
  const limites = {
    hoy: '2026-06-10',
    emisiones: ['2026-06-01', '2026-06-05'],
    fechaDeInicio: '2026-06-02' as string | null,
  };

  it('no es futura ni anterior a la emisión de ningún documento ni a la fecha de inicio', () => {
    expect(() => exigirFechaDeContrasena('2026-06-10', limites)).not.toThrow();
    expect(() => exigirFechaDeContrasena('2026-06-05', limites)).not.toThrow();
    expect(() => exigirFechaDeContrasena('2026-06-11', limites)).toThrow(FechaDeContrasenaInvalida);
    expect(() => exigirFechaDeContrasena('2026-06-04', limites)).toThrow(FechaDeContrasenaInvalida);
    expect(() =>
      exigirFechaDeContrasena('2026-06-03', { ...limites, emisiones: ['2026-06-01'], fechaDeInicio: '2026-06-04' }),
    ).toThrow(FechaDeContrasenaInvalida);
  });

  it('sin fecha de inicio solo cuentan la emisión y hoy', () => {
    expect(() => exigirFechaDeContrasena('2026-06-05', { ...limites, fechaDeInicio: null })).not.toThrow();
  });

  it('la fecha de pago no es anterior a la de la contraseña', () => {
    expect(() => exigirFechaDePago('2026-06-10', '2026-06-10')).not.toThrow();
    expect(() => exigirFechaDePago('2026-06-09', '2026-06-10')).toThrow(FechaDePagoInvalida);
  });
});

describe('las observaciones y la fecha propuesta', () => {
  it('se recortan, vacías son nulas y pasan hasta 500', () => {
    expect(observacionesDeContrasena('  hola ')).toBe('hola');
    expect(observacionesDeContrasena('   ')).toBeNull();
    expect(observacionesDeContrasena(undefined)).toBeNull();
    expect(observacionesDeContrasena('x'.repeat(500))).toHaveLength(500);
    expect(() => observacionesDeContrasena('x'.repeat(501))).toThrow(ObservacionesDeContrasenaInvalidas);
  });

  it('la fecha de pago propuesta es el mayor vencimiento, o la fecha si es anterior o no hay', () => {
    expect(proponerFechaDePago(['2026-07-01', null, '2026-08-15'], '2026-06-10')).toBe('2026-08-15');
    expect(proponerFechaDePago(['2026-05-01'], '2026-06-10')).toBe('2026-06-10');
    expect(proponerFechaDePago([null], '2026-06-10')).toBe('2026-06-10');
  });
});
