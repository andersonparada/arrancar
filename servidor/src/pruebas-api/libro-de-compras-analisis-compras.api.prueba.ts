import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias, instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import {
  armarEscenarioDeAnalisis,
  MES,
  MES_ACTUAL,
  MES_ANTERIOR,
  RAIZ_DE_ANALISIS,
  RANGO,
  type EscenarioDeAnalisis,
} from './soporte/escenario-de-analisis.js';

const entorno = usarEntornoApi();
let analisis: EscenarioDeAnalisis;

const propietario = () => analisis.escenario.cuenta.propietario;

beforeAll(async () => {
  instalarDestinoFalso();
  analisis = await armarEscenarioDeAnalisis(entorno, 'analisiscompras');
});

afterAll(() => vi.restoreAllMocks());

const consultar = async (ruta: string) => {
  const respuesta = await propietario().get(`${RAIZ_DE_ANALISIS}/${ruta}?${RANGO}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

describe('compras por proveedor', () => {
  it('suma dos meses por proveedor, con las notas de crédito restando', async () => {
    const cuerpo = await consultar('compras-por-proveedor');
    const veterinaria = cuerpo.filas.find((f: { nombre: string }) => f.nombre === 'Veterinaria El Quiroa');

    expect(cuerpo).toMatchObject({ desde: MES_ANTERIOR, hasta: MES_ACTUAL });
    expect(veterinaria).toMatchObject({
      documentos: 8,
      total: '7874.00',
      base: '6500.00',
      ivaConCredito: '660.00',
      ivaSinCredito: '120.00',
      exentoYNoAfecto: '500.00',
      idp: '94.00',
      retenido: '0.00',
      neto: '7874.00',
    });
    const servicios = cuerpo.filas.find((f: { nombre: string }) => f.nombre === 'Servicios Veterinarios');
    expect(servicios).toMatchObject({ documentos: 1, total: '1120.00', ivaConCredito: '120.00' });
  });

  it('muestra lo retenido y el neto de la factura especial, y el total suma todas las filas', async () => {
    const cuerpo = await consultar('compras-por-proveedor');
    const vendedor = cuerpo.filas.find((f: { retenido: string }) => f.retenido !== '0.00');

    expect(vendedor).toMatchObject({ documentos: 1, total: '5600.00' });
    expect(Number(vendedor.retenido)).toBeGreaterThan(0);
    expect(Number(vendedor.neto)).toBe(Number(vendedor.total) - Number(vendedor.retenido));
    expect(cuerpo.total).toMatchObject({ documentos: 10, total: '14594.00' });
  });

  it('solo cuenta un mes si el rango es de un mes, y no ve las compras de otra empresa', async () => {
    const un = await propietario().get(
      `${RAIZ_DE_ANALISIS}/compras-por-proveedor?desde=${MES(MES_ACTUAL)}&hasta=${MES(MES_ACTUAL)}`,
    );
    const ajena = await analisis.otraEmpresa.cuenta.propietario.get(
      `${RAIZ_DE_ANALISIS}/compras-por-proveedor?${RANGO}`,
    );

    expect(un.cuerpo.filas.some((f: { nombre: string }) => f.nombre === 'Servicios Veterinarios')).toBe(false);
    expect(ajena.cuerpo.total.documentos).toBe(1);
  });
});

describe('compras por concepto', () => {
  it('calcula el costo de cada línea como total menos IVA más IVA al costo', async () => {
    const cuerpo = await consultar('compras-por-concepto');
    const honorarios = cuerpo.filas.find((f: { concepto: string }) => f.concepto === 'Honorarios');
    const medicinas = cuerpo.filas.filter((f: { concepto: string }) => f.concepto === 'Medicinas');

    expect(honorarios).toMatchObject({
      tipo: 'servicio',
      lineas: 1,
      base: '1000.00',
      ivaConCredito: '120.00',
      costo: '1000.00',
    });
    expect(medicinas).toHaveLength(1);
    expect(medicinas[0]).toMatchObject({ tipo: 'bien', ivaAlCosto: '120.00' });
    const suma = cuerpo.filas.reduce((s: number, f: { costo: string }) => s + Number(f.costo), 0);
    expect(Number(cuerpo.total.costo)).toBeCloseTo(suma, 2);
  });
});

describe('IVA al costo por motivo', () => {
  it('lista la línea fuera de plazo con su documento y el subtotal del motivo', async () => {
    const cuerpo = await consultar('iva-al-costo');

    expect(cuerpo.motivos).toHaveLength(1);
    expect(cuerpo.motivos[0]).toMatchObject({ motivo: 'fuera_de_plazo', subtotal: '120.00' });
    expect(cuerpo.motivos[0].lineas[0]).toMatchObject({
      fecha: haceDias(100),
      numeroDeLinea: 1,
      concepto: 'Medicinas',
      ivaAlCosto: '120.00',
    });
    expect(cuerpo.total).toBe('120.00');
  });
});
