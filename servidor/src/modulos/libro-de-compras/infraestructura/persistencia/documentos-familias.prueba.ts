/**
 * Prueba de integración contra PostgreSQL: las familias de documento, el código del DTE (`tipo_dte`) y los `check`
 * que dependen de ellos (códigos de cada familia, IVA cero, motivo propio, inicio del primario y pecuario y factura
 * especial). La fecha de derogación de las familias derogadas no está en la base: la revisa el dominio.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import {
  contextoDe,
  documentoValido,
  errorDePostgres,
  insertarDocumento,
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';

let e: Escenario;

const crear = (cambios: Record<string, unknown> = {}) =>
  insertarDocumento(documentoValido(e, cambios), contextoDe(e, e.empresaA1, e.cuentaA));
const restriccionDe = async (cambios: Record<string, unknown>) => (await errorDePostgres(crear(cambios)))?.constraint;

/** Una factura sin IVA con el motivo propio de su familia. */
const sinIva = (tipo: string, motivoSinCredito: string, cambios: Record<string, unknown> = {}) => ({
  tipo,
  motivoSinCredito,
  iva: '0',
  base: '112',
  ...cambios,
});

const PEQUENO = sinIva('factura_pequeno_contribuyente', 'pequeno_contribuyente');
const ELECTRONICO = sinIva('factura_pequeno_contribuyente_electronico', 'pequeno_contribuyente');
const AGROPECUARIO = sinIva('factura_contribuyente_agropecuario', 'contribuyente_agropecuario');
const PRIMARIO = sinIva('factura_primario_pecuario', 'primario_pecuario');
const FAMILIAS_SIN_IVA = [PEQUENO, ELECTRONICO, AGROPECUARIO, PRIMARIO];
const ESPECIAL = { tipo: 'factura_especial', nitReceptor: '7654321' };
/** Un documento fuera del libro por no tener FEL: sin IVA, sin crédito, sin datos del SAT. */
const SIN_FEL = {
  muestraEnReportesSat: false,
  motivoFueraDelLibro: 'sin_fel',
  autorizacionFel: null,
  nitEmisor: null,
  serie: null,
  iva: '0',
  base: '112',
  motivoSinCredito: null,
};

beforeAll(async () => {
  e = await prepararEscenario('documentosfamilias');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('documentos: código del DTE', () => {
  it('cada familia acepta sus códigos y rechaza los de otra', async () => {
    const buenos: Array<[Record<string, unknown>, string[]]> = [
      [{}, ['FACT', 'FCAM']],
      [PEQUENO, ['FPEQ', 'FCAP']],
      [ELECTRONICO, ['FAPE', 'FCPE']],
      [AGROPECUARIO, ['FACA', 'FCCA', 'FAAE', 'FCAE']],
      [PRIMARIO, ['FARP', 'FCRP', 'FPEC', 'FCPC']],
      [ESPECIAL, ['FESP']],
    ];
    for (const [familia, codigos] of buenos) {
      for (const tipoDte of codigos) await expect(crear({ ...familia, tipoDte })).resolves.toBeTruthy();
    }
    expect(await restriccionDe({ tipoDte: 'FPEQ' })).toBe('documentos_tipo_dte_de_la_familia');
    expect(await restriccionDe({ ...PRIMARIO, tipoDte: 'FACA' })).toBe('documentos_tipo_dte_de_la_familia');
    expect(await restriccionDe({ ...ESPECIAL, tipoDte: 'FACT' })).toBe('documentos_tipo_dte_de_la_familia');
  });

  it('la nota lleva NCRE y el recibo RECI o RDON (o ninguno sin FEL)', async () => {
    const factura = await crear();
    const nota = { tipo: 'nota_de_credito', documentoAfectadoId: factura, fechaRecepcion: '2026-04-10' };
    const recibo = { tipo: 'recibo', ...SIN_FEL };

    await expect(crear({ ...nota, periodo: '2026-04-01', tipoDte: 'NCRE' })).resolves.toBeTruthy();
    expect(await restriccionDe({ ...nota, periodo: '2026-04-01', tipoDte: 'FACT' })).toBe(
      'documentos_tipo_dte_de_la_familia',
    );
    await expect(crear(recibo)).resolves.toBeTruthy();
    await expect(
      crear({
        ...recibo,
        motivoFueraDelLibro: 'fel_a_otro_nit',
        autorizacionFel: crypto.randomUUID(),
        tipoDte: 'RDON',
      }),
    ).resolves.toBeTruthy();
  });

  it('un código que no existe se rechaza', async () => {
    const restriccion = await restriccionDe({ tipoDte: 'XXXX' });

    expect(['documentos_tipo_dte_valido', 'documentos_tipo_dte_de_la_familia']).toContain(restriccion);
  });

  it('con FEL el código es obligatorio y sin FEL no se admite', async () => {
    expect(await restriccionDe({ tipoDte: null })).toBe('documentos_tipo_dte_con_fel');
    expect(await restriccionDe({ ...SIN_FEL, tipoDte: 'FACT' })).toBe('documentos_tipo_dte_con_fel');
  });

  it('la familia reservada (factura específica, DUCA) todavía no se acepta', async () => {
    expect(await restriccionDe({ ...SIN_FEL, tipo: 'factura_especifica' })).toBe('documentos_tipo_valido');
    expect(await restriccionDe({ ...SIN_FEL, tipo: 'duca' })).toBe('documentos_tipo_valido');
  });
});

describe('documentos: familias sin IVA', () => {
  it('cada una exige IVA cero', async () => {
    for (const familia of FAMILIAS_SIN_IVA) {
      const conIva = { ...familia, iva: '12', base: '100' };
      expect(await restriccionDe(conIva)).toBe('documentos_familia_sin_iva');
    }
  });

  it('cada una lleva su motivo y ese motivo no aparece en otra familia', async () => {
    for (const familia of FAMILIAS_SIN_IVA) await expect(crear(familia)).resolves.toBeTruthy();
    expect(await restriccionDe({ ...PEQUENO, motivoSinCredito: null })).toBe('documentos_motivo_de_la_familia');
    expect(await restriccionDe({ ...AGROPECUARIO, motivoSinCredito: 'pequeno_contribuyente' })).toBe(
      'documentos_motivo_de_la_familia',
    );
    expect(await restriccionDe({ ...PRIMARIO, motivoSinCredito: 'contribuyente_agropecuario' })).toBe(
      'documentos_motivo_de_la_familia',
    );
    expect(await restriccionDe({ ...ELECTRONICO, motivoSinCredito: 'exento' })).toBe('documentos_motivo_de_la_familia');
  });

  it('una factura no lleva el motivo de otra familia', async () => {
    for (const motivoSinCredito of ['pequeno_contribuyente', 'contribuyente_agropecuario', 'primario_pecuario']) {
      expect(await restriccionDe({ motivoSinCredito })).toBe('documentos_motivo_de_la_familia');
    }
    expect(await restriccionDe({ ...ESPECIAL, motivoSinCredito: 'primario_pecuario' })).toBe(
      'documentos_motivo_de_la_familia',
    );
  });

  it('un motivo que no existe se rechaza', async () => {
    expect(await restriccionDe({ motivoSinCredito: 'otro' })).toBe('documentos_motivo_sin_credito_valido');
  });

  it('la nota hereda el motivo de la factura agropecuaria', async () => {
    const factura = await crear(AGROPECUARIO);
    const nota = {
      tipo: 'nota_de_credito',
      documentoAfectadoId: factura,
      fechaRecepcion: '2026-04-10',
      periodo: '2026-04-01',
      iva: '0',
      base: '112',
      motivoSinCredito: 'contribuyente_agropecuario',
    };

    await expect(crear(nota)).resolves.toBeTruthy();
  });

  it('fuera del libro no se exige el motivo de la familia', async () => {
    await expect(crear({ ...PEQUENO, ...SIN_FEL, motivoSinCredito: null })).resolves.toBeTruthy();
  });
});

describe('documentos: primario y pecuario', () => {
  const emitidaEl = (fecha: string) => ({
    ...PRIMARIO,
    fechaEmision: fecha,
    fechaRecepcion: fecha,
    periodo: `${fecha.slice(0, 7)}-01`,
  });

  it('no existe antes del 2025-04-09', async () => {
    expect(await restriccionDe(emitidaEl('2025-04-08'))).toBe('documentos_primario_pecuario_desde');
    await expect(crear(emitidaEl('2025-04-09'))).resolves.toBeTruthy();
  });

  it('la familia electrónica de pequeño contribuyente pasa en la base aun después de la derogación', async () => {
    const despues = { fechaEmision: '2025-08-01', fechaRecepcion: '2025-08-01', periodo: '2025-08-01' };

    await expect(crear({ ...ELECTRONICO, ...despues })).resolves.toBeTruthy();
    await expect(crear({ ...AGROPECUARIO, ...despues })).resolves.toBeTruthy();
  });
});

describe('documentos: factura especial', () => {
  it('con IVA y crédito pasa, con el vendedor por NIT o por CUI', async () => {
    await expect(crear(ESPECIAL)).resolves.toBeTruthy();
    await expect(crear({ ...ESPECIAL, nitReceptor: '2345678901234' })).resolves.toBeTruthy();
    await expect(crear({ ...ESPECIAL, nitReceptor: '123456K' })).resolves.toBeTruthy();
  });

  it('siempre va en el libro', async () => {
    const fuera = { ...ESPECIAL, ...SIN_FEL };

    expect(await restriccionDe(fuera)).toBe('documentos_factura_especial_en_el_libro');
  });

  it('el vendedor se identifica por NIT o CUI, nunca CF, y no es la empresa', async () => {
    const vendedor = (nitReceptor: string | null) => restriccionDe({ ...ESPECIAL, nitReceptor });

    expect(await vendedor(null)).toBe('documentos_factura_especial_vendedor');
    expect(await vendedor('CF')).toBe('documentos_factura_especial_vendedor');
    expect(await vendedor('1234567')).toBe('documentos_factura_especial_vendedor');
    expect(await vendedor('12345678901234')).toBe('documentos_factura_especial_vendedor');
  });

  it('puede estar fuera de plazo de verdad y darse sin crédito', async () => {
    const tarde = {
      ...ESPECIAL,
      fechaEmision: '2026-01-10',
      fechaRecepcion: '2026-05-10',
      periodo: '2026-05-01',
      motivoSinCredito: 'fuera_de_plazo',
      ivaNoAcreditable: '12',
    };

    await expect(crear(tarde)).resolves.toBeTruthy();
  });

  it('dos empresas pueden emitir la misma serie y número al mismo vendedor (el emisor es distinto)', async () => {
    const deOtraEmpresa = documentoValido(e, { ...ESPECIAL, empresaId: e.empresaA2, nitEmisor: '9999999' });
    const propia = documentoValido(e, { ...ESPECIAL, serie: 'Z', numero: 'FE1' });
    const igual = { ...deOtraEmpresa, serie: 'Z', numero: 'FE1' };

    await insertarDocumento(propia, contextoDe(e, e.empresaA1, e.cuentaA));
    await expect(insertarDocumento(igual, contextoDe(e, e.empresaA2, e.cuentaA))).resolves.toBeTruthy();
  });
});
