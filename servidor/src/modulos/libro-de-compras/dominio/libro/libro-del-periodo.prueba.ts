import { describe, expect, it } from 'vitest';
import type { DocumentoDelLibro } from './documento-del-libro.js';
import { libroDelPeriodo } from './libro-del-periodo.js';
import { tipoDeLibroDe } from './tipo-de-libro.js';

const factura = (id: string, cambios: Partial<DocumentoDelLibro> = {}): DocumentoDelLibro => ({
  id,
  tipo: 'factura',
  tipoDte: 'FACT',
  fechaEmision: '2026-10-05',
  serie: 'A',
  numero: id,
  nitDelProveedor: '5769370',
  nombreDelProveedor: 'Proveedor',
  proveedorId: 'prov-1',
  motivoSinCredito: null,
  regimenIvaDeLaEmpresa: 'general',
  total: 112000,
  base: 100000,
  iva: 12000,
  ivaNoAcreditable: 0,
  idp: 0,
  exento: 0,
  otrosImpuestos: 0,
  categorias: [
    { categoria: 'bien', base: 100000, iva: 12000, ivaNoAcreditable: 0, exentoYNoAfecto: 0, combustibleExento: false },
  ],
  ...cambios,
});

const documentos = [
  factura('1'),
  factura('2', { motivoSinCredito: 'fuera_de_plazo', ivaNoAcreditable: 12000 }),
  factura('3', { tipo: 'nota_de_credito', tipoDte: 'NCRE', total: 56000, base: 50000, iva: 6000 }),
  factura('4', { tipo: 'nota_de_debito', tipoDte: 'NDEB', total: 11200, base: 10000, iva: 1200 }),
];

describe('tipo de libro', () => {
  it('solo el régimen general lleva el libro completo', () => {
    expect(tipoDeLibroDe('general')).toBe('completo');
    for (const regimen of ['pequeno_contribuyente', 'primario_pecuario', 'no_afiliado', 'contribuyente_agropecuario']) {
      expect(tipoDeLibroDe(regimen as never)).toBe('simplificado');
    }
  });
});

describe('libro del período', () => {
  const libro = libroDelPeriodo(documentos, 'completo');

  it('numera las filas en el orden recibido', () => {
    expect(libro.filas.map((fila) => fila.numeroDeFila)).toEqual([1, 2, 3, 4]);
  });

  it('el resumen suma las columnas con su signo', () => {
    expect(libro.resumen.totales).toMatchObject({ ivaConCredito: 12000 - 6000 + 1200, ivaSinCredito: 12000 });
    expect(libro.resumen.creditoFiscalDelPeriodo).toBe(7200);
    expect(libro.resumen.totales.total).toBe(112000 + 112000 - 56000 + 11200);
  });

  it('cuenta por código DTE y separa el IVA sin crédito por motivo', () => {
    expect(libro.resumen.porTipoDte).toEqual([
      { tipoDte: 'FACT', cantidad: 2, total: 224000 },
      { tipoDte: 'NCRE', cantidad: 1, total: -56000 },
      { tipoDte: 'NDEB', cantidad: 1, total: 11200 },
    ]);
    expect(libro.resumen.ivaSinCreditoPorMotivo).toEqual([{ motivo: 'fuera_de_plazo', ivaSinCredito: 12000 }]);
  });

  it('avisa de los documentos fuera de plazo', () => {
    expect(libro.avisos.some((aviso) => aviso.includes('fuera de plazo'))).toBe(true);
  });

  it('un período sin documentos da un libro vacío con totales en cero', () => {
    const vacio = libroDelPeriodo([], 'completo');

    expect(vacio.filas).toEqual([]);
    expect(vacio.resumen.totales.total).toBe(0);
    expect(vacio.resumen.porTipoDte).toEqual([]);
  });

  it('el libro simplificado avisa que el IVA es informativo y no tiene crédito', () => {
    const simplificado = libroDelPeriodo(documentos, 'simplificado');

    expect(simplificado.resumen.creditoFiscalDelPeriodo).toBe(0);
    expect(simplificado.resumen.totales.ivaInformativo).toBe(12000 + 12000 - 6000 + 1200);
    expect(simplificado.avisos[0]).toContain('simplificado');
  });
});
