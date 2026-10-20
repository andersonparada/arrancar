import { describe, expect, it } from 'vitest';
import type { CategoriaDelDocumento, DocumentoDelLibro } from './documento-del-libro.js';
import { COLUMNAS_DE_DINERO, filaDelLibro, type FilaDelLibro } from './fila-del-libro.js';

const categoria = (cambios: Partial<CategoriaDelDocumento> = {}): CategoriaDelDocumento => ({
  categoria: 'bien',
  base: 100000,
  iva: 12000,
  ivaNoAcreditable: 0,
  exentoYNoAfecto: 0,
  combustibleExento: false,
  ...cambios,
});

/** Una factura de Q1,120.00 (base 1,000.00 e IVA 120.00) con una línea de bien. */
const documento = (cambios: Partial<DocumentoDelLibro> = {}): DocumentoDelLibro => ({
  id: 'doc-1',
  tipo: 'factura',
  tipoDte: 'FACT',
  fechaEmision: '2026-10-05',
  serie: 'A',
  numero: '1',
  nitDelProveedor: '5769370',
  nombreDelProveedor: 'Veterinaria El Quiroa',
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
  categorias: [categoria()],
  ...cambios,
});

/** Las columnas de la fila que suman al total en el libro completo (8 a 16). */
const sumaDeColumnas = (fila: FilaDelLibro) =>
  fila.bienes +
  fila.servicios +
  fila.combustibles +
  fila.pequenoContribuyente +
  fila.primarioPecuario +
  fila.exentoYNoAfecto +
  fila.idp +
  fila.ivaConCredito +
  fila.ivaSinCredito;

interface Caso {
  nombre: string;
  documento: DocumentoDelLibro;
  esperado: Partial<FilaDelLibro>;
}

const casos: Caso[] = [
  {
    nombre: 'factura con crédito: bienes, IVA con crédito y sin motivo',
    documento: documento(),
    esperado: { bienes: 100000, ivaConCredito: 12000, ivaSinCredito: 0, total: 112000, siglaDelMotivo: null },
  },
  {
    nombre: 'nota de crédito: todo en negativo',
    documento: documento({ tipo: 'nota_de_credito', tipoDte: 'NCRE' }),
    esperado: { bienes: -100000, ivaConCredito: -12000, total: -112000, siglaDelMotivo: null },
  },
  {
    nombre: 'nota de débito: todo en positivo',
    documento: documento({ tipo: 'nota_de_debito', tipoDte: 'NDEB' }),
    esperado: { bienes: 100000, ivaConCredito: 12000, total: 112000 },
  },
  {
    nombre: 'factura especial: NIT y nombre del vendedor',
    documento: documento({ tipo: 'factura_especial', tipoDte: 'FESP', nitDelProveedor: '1234567890101' }),
    esperado: { nit: '1234567890101', nombre: 'Veterinaria El Quiroa', tipoDte: 'FESP' },
  },
  {
    nombre: 'fuera de plazo: el IVA va a la columna sin crédito con su motivo',
    documento: documento({ motivoSinCredito: 'fuera_de_plazo', ivaNoAcreditable: 12000 }),
    esperado: { ivaConCredito: 0, ivaSinCredito: 12000, siglaDelMotivo: 'FP' },
  },
  {
    nombre: 'nota de crédito de una factura fuera de plazo: el IVA sin crédito también es negativo',
    documento: documento({
      tipo: 'nota_de_credito',
      tipoDte: 'NCRE',
      motivoSinCredito: 'fuera_de_plazo',
      ivaNoAcreditable: 12000,
    }),
    esperado: { ivaSinCredito: -12000, ivaConCredito: 0, total: -112000 },
  },
  {
    nombre: 'servicios y activo fijo: el activo fijo va dentro de bienes',
    documento: documento({
      base: 300000,
      iva: 36000,
      total: 336000,
      categorias: [
        categoria({ categoria: 'servicio', base: 100000, iva: 12000 }),
        categoria({ categoria: 'activo_fijo', base: 200000, iva: 24000 }),
      ],
    }),
    esperado: { servicios: 100000, bienes: 200000 },
  },
  {
    nombre: 'combustible con IDP: base en combustibles, IDP en su columna',
    documento: documento({
      base: 90000,
      iva: 10800,
      idp: 9200,
      total: 110000,
      categorias: [categoria({ categoria: 'combustible', base: 90000, iva: 10800 })],
    }),
    esperado: { combustibles: 90000, idp: 9200, bienes: 0, total: 110000 },
  },
  {
    nombre: 'combustible exento por el Decreto 22-2026: todo exento y no afecto, sin IVA',
    documento: documento({
      base: 0,
      iva: 0,
      exento: 100000,
      total: 100000,
      motivoSinCredito: 'exento',
      categorias: [
        categoria({ categoria: 'combustible', base: 0, iva: 0, exentoYNoAfecto: 100000, combustibleExento: true }),
      ],
    }),
    esperado: { exentoYNoAfecto: 100000, combustibleExentoPorDecreto: 100000, ivaConCredito: 0, siglaDelMotivo: 'EX' },
  },
  {
    nombre: 'otros impuestos van con el exento en «exento y no afecto»',
    documento: documento({
      base: 80000,
      iva: 9600,
      exento: 10000,
      otrosImpuestos: 5000,
      total: 104600,
      categorias: [categoria({ base: 80000, iva: 9600, exentoYNoAfecto: 15000 })],
    }),
    esperado: { exentoYNoAfecto: 15000, bienes: 80000, ivaConCredito: 9600 },
  },
  {
    nombre: 'pequeño contribuyente: la base va a su columna y bienes y servicios quedan en cero',
    documento: documento({
      tipo: 'factura_pequeno_contribuyente',
      tipoDte: 'FPEQ',
      motivoSinCredito: 'pequeno_contribuyente',
      base: 50000,
      iva: 0,
      total: 50000,
      categorias: [categoria({ base: 50000, iva: 0 })],
    }),
    esperado: { pequenoContribuyente: 50000, bienes: 0, servicios: 0, ivaConCredito: 0, siglaDelMotivo: 'PC' },
  },
  {
    nombre: 'primario y pecuario: la base va a la columna de los regímenes agropecuarios',
    documento: documento({
      tipo: 'factura_primario_pecuario',
      tipoDte: 'FARP',
      motivoSinCredito: 'primario_pecuario',
      base: 70000,
      iva: 0,
      total: 70000,
      categorias: [categoria({ categoria: 'servicio', base: 70000, iva: 0 })],
    }),
    esperado: { primarioPecuario: 70000, servicios: 0, siglaDelMotivo: 'RE' },
  },
  {
    nombre: 'nota de crédito de pequeño contribuyente: su columna en negativo',
    documento: documento({
      tipo: 'nota_de_credito',
      tipoDte: 'NCRE',
      motivoSinCredito: 'pequeno_contribuyente',
      base: 5000,
      iva: 0,
      total: 5000,
      categorias: [categoria({ base: 5000, iva: 0 })],
    }),
    esperado: { pequenoContribuyente: -5000, total: -5000 },
  },
];

describe('fila del libro completo', () => {
  it.each(casos)('$nombre', ({ documento: doc, esperado }) => {
    const fila = filaDelLibro(doc, 'completo', 3);

    expect(fila).toMatchObject({ numeroDeFila: 3, documentoId: 'doc-1', ...esperado });
  });

  it.each(casos)('cuadra por fila: las columnas suman el total ($nombre)', ({ documento: doc }) => {
    const fila = filaDelLibro(doc, 'completo', 1);

    expect(sumaDeColumnas(fila)).toBe(fila.total);
  });

  it('nunca deja un cero negativo en las columnas de una nota de crédito', () => {
    const fila = filaDelLibro(documento({ tipo: 'nota_de_credito', tipoDte: 'NCRE' }), 'completo', 1);

    for (const columna of COLUMNAS_DE_DINERO) expect(Object.is(fila[columna], -0)).toBe(false);
  });
});

describe('fila del libro simplificado', () => {
  it('empresa sin crédito: el IVA es informativo y no hay columnas de crédito ni motivo', () => {
    const doc = documento({ regimenIvaDeLaEmpresa: 'pequeno_contribuyente', motivoSinCredito: 'empresa_sin_credito' });

    const fila = filaDelLibro(doc, 'simplificado', 1);

    expect(fila).toMatchObject({
      bienes: 100000,
      ivaInformativo: 12000,
      ivaConCredito: 0,
      ivaSinCredito: 0,
      pequenoContribuyente: 0,
      siglaDelMotivo: null,
      total: 112000,
    });
  });

  it('los combustibles se suman a los bienes y los servicios van aparte', () => {
    const doc = documento({
      categorias: [
        categoria({ categoria: 'combustible', base: 60000 }),
        categoria({ categoria: 'servicio', base: 40000 }),
        categoria({ categoria: 'bien', base: 0 }),
      ],
    });

    expect(filaDelLibro(doc, 'simplificado', 1)).toMatchObject({ bienes: 60000, servicios: 40000, combustibles: 0 });
  });

  it('la nota de crédito va en negativo también en el libro simplificado', () => {
    const doc = documento({ tipo: 'nota_de_credito', tipoDte: 'NCRE' });

    expect(filaDelLibro(doc, 'simplificado', 1)).toMatchObject({ bienes: -100000, ivaInformativo: -12000 });
  });
});
