import { describe, expect, it } from 'vitest';
import { casillasDelSat2237, MAPA_DE_CASILLAS_SAT_2237, type MapaDeCasillas } from './casillas-del-sat-2237.js';
import { datosDelSat2237 } from './datos-del-sat-2237.js';
import type { CategoriaDelDocumento, DocumentoDelLibro } from './documento-del-libro.js';
import { formularioDelRegimen } from './formulario-del-regimen.js';
import { operacionesDelSat2237 } from './operaciones-del-sat-2237.js';
import { proveedoresDelSat2237 } from './proveedores-del-sat-2237.js';
import { rubrosDelSat2237 } from './rubros-del-sat-2237.js';

const categoria = (cambios: Partial<CategoriaDelDocumento> = {}): CategoriaDelDocumento => ({
  categoria: 'bien',
  base: 100000,
  iva: 12000,
  ivaNoAcreditable: 0,
  exentoYNoAfecto: 0,
  combustibleExento: false,
  ...cambios,
});

/** Una factura de Q1,120.00 (base 1,000.00 e IVA 120.00) de un bien. */
const documento = (cambios: Partial<DocumentoDelLibro> = {}): DocumentoDelLibro => ({
  id: 'doc',
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

const rubro = (documentos: DocumentoDelLibro[], clave: string) =>
  rubrosDelSat2237(documentos).find((r) => r.clave === clave)!;

describe('rubros del SAT-2237', () => {
  it('siempre trae los nueve rubros en orden, y las importaciones en cero con su nota', () => {
    const rubros = rubrosDelSat2237([]);

    expect(rubros.map((r) => r.clave)).toHaveLength(9);
    expect(rubros.find((r) => r.clave === 'importaciones')).toMatchObject({
      neto: { base: 0, iva: 0 },
      nota: 'Sin DUCA en Arrancar: siempre en cero.',
    });
  });

  it('reparte bienes, servicios, combustible y activo fijo, con el crédito sin lo no acreditable', () => {
    const doc = documento({
      categorias: [
        categoria({ base: 100000, iva: 12000 }),
        categoria({ categoria: 'servicio', base: 50000, iva: 6000, ivaNoAcreditable: 1000 }),
        categoria({ categoria: 'combustible', base: 20000, iva: 2400 }),
        categoria({ categoria: 'activo_fijo', base: 30000, iva: 3600 }),
      ],
    });

    expect(rubro([doc], 'otras_compras').facturas).toEqual({ base: 100000, iva: 12000 });
    expect(rubro([doc], 'servicios').facturas).toEqual({ base: 50000, iva: 5000 });
    expect(rubro([doc], 'combustibles').neto).toEqual({ base: 20000, iva: 2400 });
    expect(rubro([doc], 'activos_fijos').neto).toEqual({ base: 30000, iva: 3600 });
  });

  it('separa facturas, notas de débito y notas de crédito (en negativo) y da el neto', () => {
    const documentos = [
      documento(),
      documento({ tipo: 'nota_de_debito', categorias: [categoria({ base: 10000, iva: 1200 })] }),
      documento({ tipo: 'nota_de_credito', categorias: [categoria({ base: 50000, iva: 6000 })] }),
    ];

    expect(rubro(documentos, 'otras_compras')).toMatchObject({
      facturas: { base: 100000, iva: 12000 },
      notasDeDebito: { base: 10000, iva: 1200 },
      notasDeCredito: { base: -50000, iva: -6000 },
      neto: { base: 60000, iva: 7200 },
    });
  });

  it('un documento sin crédito no entra a los rubros del crédito', () => {
    const fueraDePlazo = documento({ motivoSinCredito: 'fuera_de_plazo', ivaNoAcreditable: 12000 });

    expect(rubro([fueraDePlazo], 'otras_compras').neto).toEqual({ base: 0, iva: 0 });
  });

  it('pequeño contribuyente y regímenes sin IVA llevan su base y nada de crédito', () => {
    const pequeno = documento({
      tipo: 'factura_pequeno_contribuyente',
      motivoSinCredito: 'pequeno_contribuyente',
      base: 70000,
    });
    const agro = documento({ tipo: 'factura_primario_pecuario', motivoSinCredito: 'primario_pecuario', base: 30000 });

    expect(rubro([pequeno, agro], 'pequeno_contribuyente').neto).toEqual({ base: 70000, iva: 0 });
    expect(rubro([pequeno, agro], 'regimenes_sin_iva').neto).toEqual({ base: 30000, iva: 0 });
  });

  it('el exento entra a «exento y no afecto» y el del decreto también aparte', () => {
    const exento = documento({
      motivoSinCredito: 'exento',
      base: 0,
      iva: 0,
      exento: 50000,
      otrosImpuestos: 5000,
      categorias: [
        categoria({ categoria: 'combustible', base: 0, iva: 0, exentoYNoAfecto: 55000, combustibleExento: true }),
      ],
    });

    expect(rubro([exento], 'exento_y_no_afecto').neto.base).toBe(55000);
    expect(rubro([exento], 'combustibles_exentos').neto.base).toBe(55000);
    expect(rubro([exento], 'combustibles').neto.base).toBe(0);
  });
});

describe('segmento 9', () => {
  it('cuenta y suma la base de cada clase de documento, incluso los que no dan crédito', () => {
    const operaciones = operacionesDelSat2237([
      documento(),
      documento({ motivoSinCredito: 'fuera_de_plazo' }),
      documento({ tipo: 'nota_de_credito', base: 20000 }),
      documento({ tipo: 'nota_de_debito', base: 10000 }),
      documento({ tipo: 'factura_especial' }),
    ]);

    const por = (clave: string) => operaciones.find((o) => o.clave === clave);
    expect(por('facturas')).toMatchObject({ cantidad: 2, base: 200000 });
    expect(por('notas_de_credito')).toMatchObject({ cantidad: 1, base: 20000 });
    expect(por('notas_de_debito')).toMatchObject({ cantidad: 1, base: 10000 });
    expect(por('facturas_especiales')).toMatchObject({ cantidad: 1, tiposDte: ['FESP'] });
    expect(por('pequeno_contribuyente')?.cantidad).toBe(0);
  });
});

describe('detalle de proveedores', () => {
  it('agrupa por NIT, netea las notas en su proveedor y ordena por crédito', () => {
    const { proveedores } = proveedoresDelSat2237([
      documento(),
      documento(),
      documento({ tipo: 'nota_de_credito', categorias: [categoria()], base: 40000, iva: 4800 }),
      documento({ nitDelProveedor: '1234567', nombreDelProveedor: 'Otro', base: 10000, iva: 1200 }),
    ]);

    expect(proveedores.filas.map((p) => p.nit)).toEqual(['5769370', '1234567']);
    expect(proveedores.filas[0]).toMatchObject({
      cantidadDeFacturas: 2,
      cantidadDeNotasDeCredito: 1,
      base: 160000,
      credito: 19200,
      aviso: null,
    });
    expect(proveedores.total).toEqual({ cantidadDeFacturas: 3, base: 170000, credito: 20400 });
  });

  it('no incluye lo que no da crédito y avisa del proveedor que queda en negativo', () => {
    const { proveedores } = proveedoresDelSat2237([
      documento({ motivoSinCredito: 'fuera_de_plazo', nitDelProveedor: '999' }),
      documento({ tipo: 'nota_de_credito' }),
    ]);

    expect(proveedores.filas).toHaveLength(1);
    expect(proveedores.filas[0]).toMatchObject({ base: -100000, credito: -12000 });
    expect(proveedores.filas[0]?.aviso).toContain('cero o negativo');
  });

  it('la factura especial va aparte, por el NIT o CUI del vendedor', () => {
    const { proveedores, facturasEspeciales } = proveedoresDelSat2237([
      documento(),
      documento({ tipo: 'factura_especial', nitDelProveedor: '1234567890101', nombreDelProveedor: 'Marta Quiñonez' }),
    ]);

    expect(proveedores.filas).toHaveLength(1);
    expect(facturasEspeciales.filas).toEqual([
      expect.objectContaining({
        nit: '1234567890101',
        nombre: 'Marta Quiñonez',
        cantidadDeFacturas: 1,
        credito: 12000,
      }),
    ]);
  });
});

describe('casillas, avisos y formulario', () => {
  it('sin captura no hay casillas; con un mapa de prueba, solo las confirmadas', () => {
    const rubros = rubrosDelSat2237([documento()]);
    const mapa: MapaDeCasillas = {
      version: 'prueba',
      casillas: { ...MAPA_DE_CASILLAS_SAT_2237.casillas, otras_compras: { numero: 'X1', nombre: 'Compras' } },
    };

    expect(casillasDelSat2237(rubros)).toBeNull();
    expect(casillasDelSat2237(rubros, mapa)).toEqual({
      version: 'prueba',
      casillas: [{ rubro: 'otras_compras', numero: 'X1', nombre: 'Compras', neto: { base: 100000, iva: 12000 } }],
    });
  });

  it('los avisos fijos siempre van y el del decreto solo si hay combustible exento', () => {
    expect(datosDelSat2237([]).avisos.some((a) => a.includes('Medicamentos y vehículos'))).toBe(true);
    expect(datosDelSat2237([]).avisos.some((a) => a.includes('Decreto 22-2026'))).toBe(false);
    const exento = documento({
      motivoSinCredito: 'exento',
      exento: 500,
      categorias: [categoria({ categoria: 'combustible', exentoYNoAfecto: 500, combustibleExento: true })],
    });
    expect(datosDelSat2237([exento]).avisos.some((a) => a.includes('Decreto 22-2026'))).toBe(true);
  });

  it('el formulario sale del régimen', () => {
    expect(formularioDelRegimen('general')).toMatchObject({ formulario: 'SAT-2237', declaraCompras: true });
    expect(formularioDelRegimen('pequeno_contribuyente')).toMatchObject({
      formulario: 'SAT-2046',
      declaraCompras: false,
    });
    expect(formularioDelRegimen('no_afiliado')).toMatchObject({ formulario: null, declaraCompras: false });
  });
});
