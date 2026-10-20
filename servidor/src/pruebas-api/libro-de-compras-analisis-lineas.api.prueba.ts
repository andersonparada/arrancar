import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY, instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
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
  analisis = await armarEscenarioDeAnalisis(entorno, 'analisislineas');
});

afterAll(() => vi.restoreAllMocks());

const consultar = async (ruta: string) => {
  const respuesta = await propietario().get(`${RAIZ_DE_ANALISIS}/${ruta}?${RANGO}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

describe('activos fijos comprados', () => {
  it('trae las dos líneas de activo fijo con su costo y su crédito', async () => {
    const cuerpo = await consultar('activos-fijos');

    expect(cuerpo.filas.map((f: { fecha: string }) => f.fecha)).toEqual([MES_ANTERIOR, HOY]);
    expect(cuerpo.filas[0]).toMatchObject({ costo: '2000.00', ivaConCredito: '240.00' });
    expect(cuerpo.filas[1]).toMatchObject({
      descripcion: 'Báscula ganadera',
      costo: '1000.00',
      ivaConCredito: '120.00',
    });
    expect(cuerpo.total).toEqual({ costo: '3000.00', ivaConCredito: '360.00' });
  });
});

describe('combustibles e IDP', () => {
  it('agrupa por combustible y mes, con galones, IDP y subtotales', async () => {
    const cuerpo = await consultar('combustibles');
    const gasolina = cuerpo.combustibles.find((c: { combustible: string }) => c.combustible === 'Gasolina');

    expect(gasolina.meses.map((m: { periodo: string }) => m.periodo)).toEqual([MES_ANTERIOR, MES_ACTUAL]);
    expect(gasolina.meses[0]).toMatchObject({
      galones: '10.000',
      idp: '47.00',
      base: '1000.00',
      iva: '120.00',
      exentoPorDecreto: false,
    });
    expect(gasolina.subtotal).toMatchObject({ galones: '20.000', idp: '94.00', base: '2000.00', iva: '240.00' });
    expect(cuerpo.total.galones).toBe('30.000');
  });

  it('marca los meses con IVA exento por el Decreto 22-2026', async () => {
    const cuerpo = await consultar('combustibles');
    const diesel = cuerpo.combustibles.find((c: { combustible: string }) => c.combustible === 'Diésel');

    expect(diesel.meses).toHaveLength(1);
    expect(diesel.meses[0]).toMatchObject({
      exentoPorDecreto: true,
      exentoYNoAfecto: '500.00',
      iva: '0.00',
      idp: '0.00',
    });
  });
});

describe('rango, permisos y Excel', () => {
  it('rechaza un rango al revés, de más de 24 meses o mal escrito', async () => {
    const alReves = await propietario().get(
      `${RAIZ_DE_ANALISIS}/combustibles?desde=${MES(MES_ACTUAL)}&hasta=${MES(MES_ANTERIOR)}`,
    );
    const largo = await propietario().get(`${RAIZ_DE_ANALISIS}/combustibles?desde=2020-01&hasta=2023-01`);

    expect(alReves.estado).toBe(400);
    expect(alReves.cuerpo.error.codigo).toBe('rango_de_periodos_invalido');
    expect(largo.estado).toBe(400);
    expect((await propietario().get(`${RAIZ_DE_ANALISIS}/combustibles?desde=hoy&hasta=2026-01`)).estado).toBe(400);
    expect((await propietario().get(`${RAIZ_DE_ANALISIS}/combustibles`)).estado).toBe(400);
  });

  it('cada análisis exige su permiso: ver para consultar y exportar para el Excel', async () => {
    const rutas = ['compras-por-proveedor', 'compras-por-concepto', 'iva-al-costo', 'activos-fijos', 'combustibles'];
    for (const ruta of rutas) {
      expect((await analisis.soloDocumentos.get(`${RAIZ_DE_ANALISIS}/${ruta}?${RANGO}`)).estado, ruta).toBe(403);
      expect((await analisis.soloVer.get(`${RAIZ_DE_ANALISIS}/${ruta}?${RANGO}`)).estado, ruta).toBe(200);
      expect((await analisis.soloVer.get(`${RAIZ_DE_ANALISIS}/${ruta}/exportar?${RANGO}`)).estado, ruta).toBe(403);
    }
  });

  it('baja un .xlsx de cada análisis con analisis-de-compras.exportar', async () => {
    const rutas = ['compras-por-proveedor', 'compras-por-concepto', 'iva-al-costo', 'activos-fijos', 'combustibles'];
    for (const ruta of rutas) {
      const respuesta = await propietario().get(`${RAIZ_DE_ANALISIS}/${ruta}/exportar?${RANGO}`);
      expect(respuesta.estado, ruta).toBe(200);
      expect(String(respuesta.cabeceras['content-type'])).toContain('spreadsheetml');
      expect(String(respuesta.cabeceras['content-disposition'])).toContain(`${ruta}-`);
      expect(Buffer.from(respuesta.cuerpo).subarray(0, 2).toString()).toBe('PK');
    }
  });
});
