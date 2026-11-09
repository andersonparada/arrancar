import { describe, expect, it } from 'vitest';
import {
  documentoDelLibro,
  esDeLoPropio,
  exigirAnulable,
  exigirEliminable,
  exigirAutorizado,
  exigirPendiente,
  exigirRegistrado,
  exigirVencimientoNuevoValido,
  vencimientoAlCompletar,
} from './ciclo-de-vida.js';
import type { DocumentoPorPagar } from './documento-por-pagar.js';
import { DocumentoNoRegistrado, DocumentoYaAnulado, DocumentoYaAutorizado, EsUnSaldoInicial } from './errores.js';

const documento = (cambios: Partial<DocumentoPorPagar> = {}): DocumentoPorPagar => ({
  id: 'doc',
  origen: 'libro_de_compras',
  documentoId: 'libro',
  serie: 'A',
  numero: '100',
  tipo: 'factura',
  proveedorId: 'proveedor',
  documentoAfectadoId: null,
  fechaEmision: '2026-03-10',
  totalCentavos: 11200,
  retencionesCentavos: 0,
  saldoAlInicioCentavos: null,
  retencionesPorPracticarCentavos: null,
  referencia: null,
  tieneActivoFijo: false,
  vencimiento: '2026-04-10',
  ingresadoPor: 'ana',
  estado: 'pendiente',
  registradoEn: null,
  registradoPor: null,
  autorizadoEn: null,
  autorizadoPor: null,
  autorizacionPropia: false,
  ...cambios,
});

describe('estados del ciclo de vida', () => {
  it('completar exige un documento pendiente', () => {
    expect(() => exigirPendiente(documento(), 'A-1')).not.toThrow();
    expect(() => exigirPendiente(documento({ estado: 'registrado' }), 'A-1')).toThrow(/A-1/);
  });

  it('autorizar exige un documento completado', () => {
    expect(() => exigirRegistrado(documento({ estado: 'registrado' }), 'A-1')).not.toThrow();
    expect(() => exigirRegistrado(documento({ estado: 'pendiente' }), 'A-1')).toThrow(DocumentoNoRegistrado);
  });

  it('autorizar dice si el documento ya está autorizado o ya está anulado', () => {
    expect(() => exigirRegistrado(documento({ estado: 'autorizado' }), 'A-1')).toThrow(DocumentoYaAutorizado);
    expect(() => exigirRegistrado(documento({ estado: 'autorizado' }), 'A-1')).toThrow(
      'El documento A-1 ya está autorizado.',
    );
    expect(() => exigirRegistrado(documento({ estado: 'anulado' }), 'A-1')).toThrow(DocumentoYaAnulado);
  });

  it('desautorizar exige un documento autorizado', () => {
    expect(() => exigirAutorizado(documento({ estado: 'autorizado' }), 'A-1')).not.toThrow();
    expect(() => exigirAutorizado(documento({ estado: 'registrado' }), 'A-1')).toThrow(/A-1/);
  });
});

describe('separación de funciones', () => {
  it('es de lo propio lo que el usuario ingresó en Libro de compras o completó', () => {
    expect(esDeLoPropio(documento(), 'ana')).toBe(true);
    expect(esDeLoPropio(documento({ registradoPor: 'beto' }), 'beto')).toBe(true);
    expect(esDeLoPropio(documento({ registradoPor: 'beto' }), 'carla')).toBe(false);
  });

  it('un documento sin quien lo ingresó ni lo completó no es de nadie', () => {
    expect(esDeLoPropio(documento({ ingresadoPor: null }), 'ana')).toBe(false);
  });
});

describe('vencimiento al completar', () => {
  it('un cargo conserva el propuesto si no se escribe otro, y toma el escrito si se escribe', () => {
    expect(vencimientoAlCompletar(documento(), undefined)).toBe('2026-04-10');
    expect(vencimientoAlCompletar(documento(), '2026-05-01')).toBe('2026-05-01');
  });

  it('un cargo puede vencer el mismo día de su emisión, pero no antes', () => {
    expect(vencimientoAlCompletar(documento(), '2026-03-10')).toBe('2026-03-10');
    expect(() => vencimientoAlCompletar(documento(), '2026-03-09')).toThrow(/anterior a la fecha de emisión/);
  });

  it('una nota de crédito queda sin vencimiento y no admite uno', () => {
    const nota = documento({ tipo: 'nota_de_credito', vencimiento: null });

    expect(vencimientoAlCompletar(nota, undefined)).toBeNull();
    expect(() => vencimientoAlCompletar(nota, '2026-05-01')).toThrow(/no vence/);
  });
});

describe('cambiar el vencimiento', () => {
  it('vale para un cargo completado o autorizado, con una fecha desde la emisión', () => {
    for (const estado of ['registrado', 'autorizado'] as const) {
      expect(() => exigirVencimientoNuevoValido(documento({ estado }), '2026-06-01', 'A-1')).not.toThrow();
    }
    expect(() => exigirVencimientoNuevoValido(documento({ estado: 'registrado' }), '2026-03-01', 'A-1')).toThrow(
      /anterior a la fecha de emisión/,
    );
  });

  it('no vale para lo pendiente, lo anulado ni una nota de crédito', () => {
    const casos = [
      documento({ estado: 'pendiente' }),
      documento({ estado: 'anulado' }),
      documento({ estado: 'registrado', tipo: 'nota_de_credito', vencimiento: null }),
    ];
    for (const caso of casos) {
      expect(() => exigirVencimientoNuevoValido(caso, '2026-06-01', 'A-1')).toThrow(/A-1/);
    }
  });
});

describe('un saldo inicial no se anula ni se elimina por Documentos', () => {
  const saldoInicial = documento({ origen: 'saldo_inicial', documentoId: null, estado: 'registrado' });

  it('anular y eliminar lo rechazan', () => {
    expect(() => exigirAnulable(saldoInicial, 0, 'S-1')).toThrow(EsUnSaldoInicial);
    expect(() => exigirEliminable(saldoInicial, 0, 'S-1')).toThrow(EsUnSaldoInicial);
  });

  it('solo un documento del libro tiene id en Libro de compras', () => {
    expect(() => documentoDelLibro(saldoInicial, 'S-1')).toThrow(EsUnSaldoInicial);
    expect(documentoDelLibro(documento({ documentoId: 'abc' }), 'A-1')).toBe('abc');
  });
});
