import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import {
  crearArticulo,
  crearBodega,
  entrada,
  kardexDe,
  prepararKardex,
  salida,
  type EscenarioDeKardex,
} from './soporte/escenario-de-kardex.js';

const entorno = usarEntornoApi();
const RUTA_DE_BODEGAS = '/api/inventarios/bodegas';
const PERMISOS_DE_BODEGUERO = [
  'inventarios.existencias.ver',
  'inventarios.entradas.crear',
  'inventarios.entradas.anular',
  'inventarios.salidas.crear',
  'inventarios.salidas.anular',
];

let e: EscenarioDeKardex;
let bodega1: string;
let bodega2: string;
let articulo: string;
let bodeguero1: ClienteApi;
let bodeguero2: ClienteApi;
let jefe: ClienteApi;
let salidaDeBodega2: string;
let entradaDeBodega1: string;

const idDe = async (cliente: ClienteApi) => (await cliente.get('/api/sesion')).cuerpo.usuario.id as string;

async function asignar(administrador: ClienteApi, cliente: ClienteApi, bodegaId: string) {
  const respuesta = await administrador.put(`${RUTA_DE_BODEGAS}/accesos/${await idDe(cliente)}`, {
    bodegaIds: [bodegaId],
  });
  expect(respuesta.estado).toBe(200);
}

beforeAll(async () => {
  e = await prepararKardex(entorno, 'kardexaislamiento');
  const propietario = e.cuenta.propietario;
  [bodega1, bodega2] = [e.bodegaId, await crearBodega(propietario)];
  articulo = await crearArticulo(propietario, e.referencias);
  const nuevoUsuario = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.cuenta, { nombres, apellidos: 'Kardex', permisos });
  jefe = await nuevoUsuario('Jefe', ['inventarios.bodegas.asignar', 'inventarios.bodegas.ver']);
  bodeguero1 = await nuevoUsuario('Uno', [...PERMISOS_DE_BODEGUERO, 'inventarios.costos.ver']);
  bodeguero2 = await nuevoUsuario('Dos', PERMISOS_DE_BODEGUERO);
  await asignar(jefe, bodeguero1, bodega1);
  await asignar(jefe, bodeguero2, bodega2);

  const primera = await entrada(propietario, {
    bodegaId: bodega1,
    fecha: '2026-07-01',
    renglones: [{ articuloId: articulo, cantidad: '100', costoTotal: '200.00' }],
  });
  entradaDeBodega1 = primera.cuerpo.id;
  await entrada(propietario, {
    bodegaId: bodega2,
    fecha: '2026-07-02',
    renglones: [{ articuloId: articulo, cantidad: '50', costoTotal: '115.00' }],
  });
  const consumo = await salida(propietario, e, {
    bodegaId: bodega2,
    fecha: '2026-07-05',
    renglones: [{ articuloId: articulo, cantidad: '40' }],
  });
  salidaDeBodega2 = consumo.cuerpo.id;
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('aislamiento del kardex con dos bodegueros (R-3)', () => {
  it('cada uno lista y abre solo los documentos de su bodega', async () => {
    const del1 = (await bodeguero1.get('/api/inventarios/documentos')).cuerpo as Array<{ bodegaId: string }>;
    const del2 = (await bodeguero2.get('/api/inventarios/documentos')).cuerpo as Array<{ bodegaId: string }>;

    expect(del1.map((d) => d.bodegaId)).toEqual([bodega1]);
    expect(del2.map((d) => d.bodegaId)).toEqual([bodega2, bodega2]);
    expect((await bodeguero1.get(`/api/inventarios/documentos/${salidaDeBodega2}`)).estado).toBe(404);
    expect((await bodeguero2.get(`/api/inventarios/documentos/${entradaDeBodega1}`)).estado).toBe(404);
  });

  it('las existencias solo traen las bodegas asignadas', async () => {
    const del1 = (await bodeguero1.get('/api/inventarios/existencias')).cuerpo;
    const del2 = (await bodeguero2.get('/api/inventarios/existencias')).cuerpo;

    expect(del1.map((f: { bodegaId: string; cantidad: string }) => [f.bodegaId, f.cantidad])).toEqual([
      [bodega1, '100.0000'],
    ]);
    expect(del2.map((f: { bodegaId: string; cantidad: string }) => [f.bodegaId, f.cantidad])).toEqual([
      [bodega2, '10.0000'],
    ]);
  });

  it('el kardex de una bodega lleva su propio saldo y nunca el de la empresa', async () => {
    const kardex1 = await kardexDe(bodeguero1, articulo, `?bodegaId=${bodega1}`);
    const kardex2 = await kardexDe(bodeguero2, articulo, `?bodegaId=${bodega2}`);

    expect(kardex1.renglones.map((r: { saldoCantidad: string }) => r.saldoCantidad)).toEqual(['100.0000']);
    expect(kardex2.renglones.map((r: { saldoCantidad: string }) => r.saldoCantidad)).toEqual(['50.0000', '10.0000']);
    // El de la empresa llegó a 150 y a 110: ninguno de esos números sale en lo que ven los bodegueros.
    const texto = JSON.stringify([kardex1, kardex2]);
    expect(texto).not.toMatch(/150\.0000|110\.0000|315\.00|231\.00/);
  });

  it('sin permiso de costos no hay dinero; con él, el valor es de la bodega a su costo unitario', async () => {
    const con = await kardexDe(bodeguero1, articulo, `?bodegaId=${bodega1}`);
    const sin = await kardexDe(bodeguero2, articulo, `?bodegaId=${bodega2}`);

    expect(con.renglones[0]).toMatchObject({ costoTotal: '200.00', saldoValor: '200.00' });
    expect(sin.renglones.every((r: Record<string, unknown>) => r.costoTotal === null && r.saldoValor === null)).toBe(
      true,
    );
    const documentos = (await bodeguero2.get('/api/inventarios/documentos')).cuerpo;
    expect(JSON.stringify(documentos)).not.toMatch(/costoTotal":"/);
    const existencias = (await bodeguero2.get('/api/inventarios/existencias')).cuerpo;
    expect(existencias[0]).toMatchObject({ costoUnitario: null, valor: null });
  });

  it('el kardex de toda la empresa es solo para quien ve todas las bodegas', async () => {
    const todas = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Todas',
      apellidos: 'Bodegas',
      permisos: ['inventarios.existencias.ver', 'inventarios.bodegas.ver-todas', 'inventarios.costos.ver'],
    });

    const sinBodega = await bodeguero1.get(`/api/inventarios/articulos/${articulo}/kardex`);
    const deOtra = await bodeguero1.get(`/api/inventarios/articulos/${articulo}/kardex?bodegaId=${bodega2}`);
    const completo = await kardexDe(todas, articulo);

    expect(sinBodega.estado).toBe(403);
    expect(deOtra.estado).toBe(404);
    expect(completo.renglones.map((r: { saldoCantidad: string }) => r.saldoCantidad)).toEqual([
      '100.0000',
      '150.0000',
      '110.0000',
    ]);
  });

  it('no se puede registrar, sacar ni anular en una bodega ajena', async () => {
    const intento = await entrada(bodeguero1, {
      bodegaId: bodega2,
      fecha: '2026-07-06',
      renglones: [{ articuloId: articulo, cantidad: '1', costoTotal: '2.00' }],
    });
    const consumo = await salida(bodeguero1, e, {
      bodegaId: bodega2,
      fecha: '2026-07-06',
      renglones: [{ articuloId: articulo, cantidad: '1' }],
    });
    const anulada = await bodeguero1.post(`/api/inventarios/salidas/${salidaDeBodega2}/anular`, { motivo: 'Ajena' });

    expect([intento.estado, consumo.estado, anulada.estado]).toEqual([404, 404, 404]);
  });

  it('el recálculo de un bodeguero corrige las salidas de la bodega que no ve', async () => {
    const compra = await entrada(bodeguero1, {
      bodegaId: bodega1,
      fecha: '2026-07-03',
      renglones: [{ articuloId: articulo, cantidad: '100', costoTotal: '260.00' }],
    });

    const consumo = (await e.cuenta.propietario.get(`/api/inventarios/documentos/${salidaDeBodega2}`)).cuerpo;
    expect(compra.estado).toBe(201);
    expect(consumo.renglones[0].costoTotal).toBe('92.00');
    expect((await bodeguero1.get(`/api/inventarios/documentos/${salidaDeBodega2}`)).estado).toBe(404);
  });
});
