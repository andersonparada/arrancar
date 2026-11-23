import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import {
  crearArticulo,
  crearBodega,
  entrada,
  prepararKardex,
  type EscenarioDeKardex,
} from './soporte/escenario-de-kardex.js';
import { anularTraslado, fijarTransito, recibir, trasladar } from './soporte/escenario-de-traslados.js';

const entorno = usarEntornoApi();
const PERMISOS = [
  'inventarios.existencias.ver',
  'inventarios.bodegas.ver',
  'inventarios.traslados.crear',
  'inventarios.traslados.recibir',
  'inventarios.traslados.anular',
];

let e: EscenarioDeKardex;
let origen: string;
let destino: string;
let articulo: string;
let remitente: ClienteApi;
let receptor: ClienteApi;
let enTransito: string;

const idDe = async (cliente: ClienteApi) => (await cliente.get('/api/sesion')).cuerpo.usuario.id as string;

async function asignar(administrador: ClienteApi, cliente: ClienteApi, bodegaId: string) {
  const ruta = `/api/inventarios/bodegas/accesos/${await idDe(cliente)}`;
  expect((await administrador.put(ruta, { bodegaIds: [bodegaId] })).estado).toBe(200);
}

const enviar = (cliente: ClienteApi, cantidad: string, hacia = destino) =>
  trasladar(cliente, { origen, destino: hacia, renglones: [{ articuloId: articulo, cantidad }] });

beforeAll(async () => {
  e = await prepararKardex(entorno, 'trasvis');
  const propietario = e.cuenta.propietario;
  [origen, destino] = [e.bodegaId, await crearBodega(propietario)];
  articulo = await crearArticulo(propietario, e.referencias);
  const nuevo = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.cuenta, { nombres, apellidos: 'Traslado', permisos });
  const jefe = await nuevo('Jefe', ['inventarios.bodegas.asignar', 'inventarios.bodegas.ver']);
  [remitente, receptor] = [await nuevo('Remitente', PERMISOS), await nuevo('Receptor', PERMISOS)];
  await asignar(jefe, remitente, origen);
  await asignar(jefe, receptor, destino);
  await entrada(propietario, {
    bodegaId: origen,
    fecha: '2026-07-01',
    renglones: [{ articuloId: articulo, cantidad: '100', costoTotal: '200.00' }],
  });
  await fijarTransito(entorno, e, true);
  enTransito = (await enviar(remitente, '30')).cuerpo.id;
});

afterAll(async () => {
  await fijarTransito(entorno, e, false);
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('destinos', () => {
  it('quien puede crear traslados elige entre todas las bodegas activas aunque solo vea la suya', async () => {
    const respuesta = await remitente.get('/api/inventarios/traslados/destinos');

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.map((b: { id: string }) => b.id)).toEqual(expect.arrayContaining([origen, destino]));
    expect(Object.keys(respuesta.cuerpo[0]).sort()).toEqual(['id', 'nombre']);
  });

  it('sin tránsito solo ofrece las bodegas que el usuario ve', async () => {
    await fijarTransito(entorno, e, false);

    const lista = (await remitente.get('/api/inventarios/traslados/destinos')).cuerpo as { id: string }[];
    await fijarTransito(entorno, e, true);

    expect(lista.map((b) => b.id)).toEqual([origen]);
  });

  it('exige el permiso de crear traslados y no ofrece las bodegas inactivas', async () => {
    const sinPermiso = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Mirón',
      apellidos: 'Traslado',
      permisos: ['inventarios.bodegas.ver'],
    });
    const inactiva = await crearBodega(e.cuenta.propietario);
    const actual = (await e.cuenta.propietario.get(`/api/inventarios/bodegas/${inactiva}`)).cuerpo;
    await e.cuenta.propietario.put(`/api/inventarios/bodegas/${inactiva}`, { ...actual, activo: false });

    const lista = (await remitente.get('/api/inventarios/traslados/destinos')).cuerpo as { id: string }[];

    expect((await sinPermiso.get('/api/inventarios/traslados/destinos')).estado).toBe(403);
    expect(lista.map((b) => b.id)).not.toContain(inactiva);
  });
});

describe('lo que ve cada lado', () => {
  it('«Por recibir» se limita al destino y el receptor ve de dónde viene', async () => {
    const porRecibir = (cliente: ClienteApi, bodegaId: string) =>
      cliente.get(`/api/inventarios/documentos?estadoDeTraslado=en_transito&bodegaDeDestinoId=${bodegaId}`);

    const alDestino = (await porRecibir(receptor, destino)).cuerpo;
    const alOrigen = (await porRecibir(remitente, origen)).cuerpo;

    expect(alDestino.map((d: { id: string }) => d.id)).toEqual([enTransito]);
    expect(alDestino[0].bodegaNombre).toContain('Bodega de kardex');
    expect(alOrigen).toEqual([]);
  });

  it('el remitente ve en la boleta quién recibió y cuándo', async () => {
    const hecha = await recibir(receptor, enTransito, { fecha: '2026-07-12' });

    const boleta = (await remitente.get(`/api/inventarios/documentos/${enTransito}/boleta`)).cuerpo;

    expect(hecha.estado).toBe(200);
    expect(boleta).toMatchObject({
      estado: 'recibido',
      recibidoPor: 'Receptor Traslado',
      fechaDeRecepcion: '2026-07-12',
    });
  });
});

describe('guardas', () => {
  it('anular un traslado recibido audita la salida tal como estaba: recibida y ligada a su entrada', async () => {
    expect((await anularTraslado(e.cuenta.propietario, enTransito)).estado).toBe(200);

    const [fila] = await comoPropietario<{ anterior: Record<string, unknown> }>(
      `select anterior from core.auditoria where empresa_id = $1 and registro_id = $2 and accion = 'anular'`,
      [e.cuenta.empresaId, enTransito],
    );

    expect(fila!.anterior).toMatchObject({ estadoDeTraslado: 'recibido' });
    expect(fila!.anterior.documentoRelacionadoId).toEqual(expect.any(String));
  });

  it('una bodega con un traslado en camino no se inactiva, aunque no tenga existencias', async () => {
    const llegada = await crearBodega(e.cuenta.propietario);
    const enCamino = (await enviar(e.cuenta.propietario, '5', llegada)).cuerpo.id;
    const actual = (await e.cuenta.propietario.get(`/api/inventarios/bodegas/${llegada}`)).cuerpo;
    const inactivar = () =>
      e.cuenta.propietario.put(`/api/inventarios/bodegas/${llegada}`, { ...actual, activo: false });

    const rechazada = await inactivar();
    await anularTraslado(e.cuenta.propietario, enCamino);
    const aceptada = await inactivar();

    expect([rechazada.estado, rechazada.cuerpo.error.codigo]).toEqual([422, 'bodega_con_traslados_en_transito']);
    expect(aceptada.estado).toBe(200);
  });
});
