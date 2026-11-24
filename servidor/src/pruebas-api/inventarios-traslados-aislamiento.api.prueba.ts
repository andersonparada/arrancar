import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
const PERMISOS_DE_TRASLADOS = [
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
let ajeno: ClienteApi;
let enTransito: string;

const idDe = async (cliente: ClienteApi) => (await cliente.get('/api/sesion')).cuerpo.usuario.id as string;

async function asignar(administrador: ClienteApi, cliente: ClienteApi, bodegaId: string) {
  const respuesta = await administrador.put(`/api/inventarios/bodegas/accesos/${await idDe(cliente)}`, {
    bodegaIds: [bodegaId],
  });
  expect(respuesta.estado).toBe(200);
}

const enviar = (cliente: ClienteApi, cantidad: string, cambios: Record<string, unknown> = {}) =>
  trasladar(cliente, { origen, destino, renglones: [{ articuloId: articulo, cantidad }], ...cambios });

beforeAll(async () => {
  e = await prepararKardex(entorno, 'trasaisl');
  const propietario = e.cuenta.propietario;
  [origen, destino] = [e.bodegaId, await crearBodega(propietario)];
  articulo = await crearArticulo(propietario, e.referencias);
  const nuevo = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.cuenta, { nombres, apellidos: 'Traslado', permisos });
  const jefe = await nuevo('Jefe', ['inventarios.bodegas.asignar', 'inventarios.bodegas.ver']);
  [remitente, receptor, ajeno] = [
    await nuevo('Remitente', PERMISOS_DE_TRASLADOS),
    await nuevo('Receptor', PERMISOS_DE_TRASLADOS),
    await nuevo('Ajeno', PERMISOS_DE_TRASLADOS),
  ];
  await asignar(jefe, remitente, origen);
  await asignar(jefe, receptor, destino);
  await entrada(propietario, {
    bodegaId: origen,
    fecha: '2026-07-01',
    renglones: [{ articuloId: articulo, cantidad: '100', costoTotal: '200.00' }],
  });
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('sin tránsito', () => {
  it('exige ver las dos bodegas: quien solo ve el origen no puede enviar', async () => {
    const respuesta = await enviar(remitente, '10');

    expect([respuesta.estado, respuesta.cuerpo.error.codigo]).toEqual([422, 'bodega_fuera_de_alcance']);
  });

  it('quien ve las dos bodegas sí; quien no ve ninguna, no', async () => {
    const hecho = await enviar(e.cuenta.propietario, '10');
    const ajena = await enviar(ajeno, '10');

    expect(hecho.estado).toBe(201);
    expect(ajena.estado).toBe(422);
  });
});

describe('con tránsito', () => {
  beforeAll(() => fijarTransito(entorno, e, true));
  afterAll(() => fijarTransito(entorno, e, false));

  it('quien envía solo ve el origen, pero puede elegir el destino y ve su nombre', async () => {
    const respuesta = await enviar(remitente, '30');

    enTransito = respuesta.cuerpo.id;
    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({ estadoDeTraslado: 'en_transito', bodegaDeDestinoId: destino });
    expect(respuesta.cuerpo.bodegaDeDestinoNombre).toContain('Bodega de kardex');
    expect((await remitente.get('/api/inventarios/bodegas')).cuerpo.map((b: { id: string }) => b.id)).toEqual([origen]);
  });

  it('el traslado en tránsito lo ven quien tiene el origen y quien tiene el destino, y nadie más', async () => {
    const lista = async (cliente: ClienteApi) =>
      ((await cliente.get('/api/inventarios/documentos?estadoDeTraslado=en_transito')).cuerpo as { id: string }[]).map(
        (d) => d.id,
      );

    expect(await lista(remitente)).toEqual([enTransito]);
    expect(await lista(receptor)).toEqual([enTransito]);
    expect(await lista(ajeno)).toEqual([]);
    expect((await receptor.get(`/api/inventarios/documentos/${enTransito}/boleta`)).estado).toBe(200);
    expect((await ajeno.get(`/api/inventarios/documentos/${enTransito}/boleta`)).estado).toBe(404);
  });

  it('solo recibe quien ve el destino', async () => {
    const delRemitente = await recibir(remitente, enTransito);
    const delAjeno = await recibir(ajeno, enTransito);

    expect([delRemitente.estado, delRemitente.cuerpo.error.codigo]).toEqual([422, 'bodega_fuera_de_alcance']);
    expect(delAjeno.estado).toBe(404);
  });

  it('solo anula un traslado en tránsito quien ve el origen', async () => {
    const delReceptor = await anularTraslado(receptor, enTransito);
    const delAjeno = await anularTraslado(ajeno, enTransito);

    expect([delReceptor.estado, delReceptor.cuerpo.error.codigo]).toEqual([422, 'bodega_fuera_de_alcance']);
    expect(delAjeno.estado).toBe(404);
  });

  it('el receptor recibe y cada uno ve lo suyo: el remitente no ve la entrada del destino', async () => {
    const recibido = await recibir(receptor, enTransito, { fecha: '2026-07-12' });

    expect(recibido.estado).toBe(200);
    expect(recibido.cuerpo.estadoDeTraslado).toBe('recibido');
    const clases = async (cliente: ClienteApi) =>
      ((await cliente.get('/api/inventarios/documentos?estado=vigente')).cuerpo as { clase: string }[])
        .map((d) => d.clase)
        .filter((clase) => clase.endsWith('traslado'))
        .sort();
    expect(await clases(remitente)).not.toContain('entrada_de_traslado');
    expect(await clases(receptor)).toEqual(expect.arrayContaining(['entrada_de_traslado', 'salida_de_traslado']));
  });

  it('anular un traslado recibido exige ver las dos bodegas', async () => {
    const delRemitente = await anularTraslado(remitente, enTransito);
    const delPropietario = await anularTraslado(e.cuenta.propietario, enTransito);

    expect([delRemitente.estado, delRemitente.cuerpo.error.codigo]).toEqual([422, 'bodega_fuera_de_alcance']);
    expect(delPropietario.estado).toBe(200);
  });

  it('un destino de otra empresa no existe', async () => {
    const otra = await prepararKardex(entorno, 'trasajena');

    const respuesta = await enviar(e.cuenta.propietario, '1', { destino: otra.bodegaId });

    expect(respuesta.estado).toBe(404);
  });
});
