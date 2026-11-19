import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  crearArticulo,
  crearBodega,
  entrada,
  prepararKardex,
  salida,
  type EscenarioDeKardex,
} from './soporte/escenario-de-kardex.js';
import { datosDeArticulo } from './inventarios.soporte.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;

const propietario = () => e.cuenta.propietario;
const dar = (articuloId: string, bodegaId = e.bodegaId) =>
  entrada(propietario(), {
    bodegaId,
    fecha: '2026-03-01',
    renglones: [{ articuloId, cantidad: '10', costoTotal: '20.00' }],
  });
const sacarTodo = (articuloId: string) =>
  salida(propietario(), e, {
    bodegaId: e.bodegaId,
    fecha: '2026-03-02',
    renglones: [{ articuloId, cantidad: '10' }],
  });

beforeAll(async () => {
  e = await prepararKardex(entorno, 'guardiascatalogos');
});

describe('un artículo con movimientos', () => {
  it('no cambia su unidad base ni si maneja lotes, pero sí otros datos', async () => {
    const articulo = await crearArticulo(propietario(), e.referencias);
    await dar(articulo);
    const actual = (await propietario().get(`/api/inventarios/articulos/${articulo}`)).cuerpo;
    const cambiar = (cambios: Record<string, unknown>) =>
      propietario().put(
        `/api/inventarios/articulos/${articulo}`,
        datosDeArticulo(e.referencias, { ...actual, ...cambios }),
      );

    const unidad = await cambiar({ unidadBaseId: e.referencias.unidadDeCajaId });
    const lotes = await cambiar({ manejaLotes: true });
    const nombre = await cambiar({ nombre: 'Con otro nombre' });

    expect([unidad.estado, unidad.cuerpo.error.codigo]).toEqual([422, 'unidad_base_fija']);
    expect([lotes.estado, lotes.cuerpo.error.codigo]).toEqual([422, 'unidad_base_fija']);
    expect(nombre.estado).toBe(200);
  });

  it('sin movimientos sí cambia su unidad base', async () => {
    const articulo = await crearArticulo(propietario(), e.referencias);

    const cambiado = await propietario().put(
      `/api/inventarios/articulos/${articulo}`,
      datosDeArticulo(e.referencias, { unidadBaseId: e.referencias.unidadDeCajaId }),
    );

    expect(cambiado.estado).toBe(200);
  });
});

describe('inactivar con existencias', () => {
  it('un artículo con existencias no se inactiva hasta sacarlas', async () => {
    const articulo = await crearArticulo(propietario(), e.referencias);
    await dar(articulo);
    const actual = (await propietario().get(`/api/inventarios/articulos/${articulo}`)).cuerpo;
    const inactivar = () =>
      propietario().put(
        `/api/inventarios/articulos/${articulo}`,
        datosDeArticulo(e.referencias, { ...actual, activo: false }),
      );

    const rechazado = await inactivar();
    await sacarTodo(articulo);
    const aceptado = await inactivar();

    expect([rechazado.estado, rechazado.cuerpo.error.codigo]).toEqual([422, 'articulo_con_existencias']);
    expect(aceptado.estado).toBe(200);
  });

  it('una bodega con existencias no se inactiva hasta sacarlas', async () => {
    const bodega = await crearBodega(propietario());
    const articulo = await crearArticulo(propietario(), e.referencias);
    await dar(articulo, bodega);
    const actual = (await propietario().get(`/api/inventarios/bodegas/${bodega}`)).cuerpo;
    const inactivar = () => propietario().put(`/api/inventarios/bodegas/${bodega}`, { ...actual, activo: false });

    const rechazada = await inactivar();
    await salida(propietario(), e, {
      bodegaId: bodega,
      fecha: '2026-03-02',
      renglones: [{ articuloId: articulo, cantidad: '10' }],
    });
    const aceptada = await inactivar();

    expect([rechazada.estado, rechazada.cuerpo.error.codigo]).toEqual([422, 'bodega_con_existencias']);
    expect(aceptada.estado).toBe(200);
  });
});
