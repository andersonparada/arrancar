import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/inventarios.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta } from './soporte/escenarios.js';
import {
  crearArticulo,
  crearBodega,
  entrada,
  prepararKardex,
  salida,
  type EscenarioDeKardex,
} from './soporte/escenario-de-kardex.js';

const entorno = usarEntornoApi();
let e: EscenarioDeKardex;
const entradas: Array<Record<string, any>> = [];
const salidas: Array<Record<string, any>> = [];

const propietario = () => e.cuenta.propietario;
const unidadesPorNombre = async () =>
  new Map(
    ((await propietario().get('/api/inventarios/unidades')).cuerpo as Array<{ id: string; nombre: string }>).map(
      (u) => [u.nombre, u.id],
    ),
  );

beforeAll(async () => {
  busEventos.suscribir('inventarios.entrada_registrada', (datos) => {
    entradas.push(datos);
  });
  busEventos.suscribir('inventarios.salida_registrada', (datos) => {
    salidas.push(datos);
  });
  e = await prepararKardex(entorno, 'kardexdocumentos');
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('entradas manuales', () => {
  it('guardan el documento numerado, mueven las existencias y publican el evento', async () => {
    const articulo = await crearArticulo(propietario(), e.referencias);

    const primera = await entrada(propietario(), {
      bodegaId: e.bodegaId,
      fecha: '2026-01-10',
      renglones: [{ articuloId: articulo, cantidad: '12.5', costoTotal: '30.00' }],
    });
    const segunda = await entrada(propietario(), {
      bodegaId: e.bodegaId,
      fecha: '2026-01-11',
      renglones: [{ articuloId: articulo, cantidad: '1', costoTotal: '2.00' }],
    });

    expect(primera.estado).toBe(201);
    expect(primera.cuerpo).toMatchObject({
      clase: 'entrada_manual',
      numero: 1,
      estado: 'vigente',
      costoTotal: '30.00',
    });
    expect(segunda.cuerpo.numero).toBe(2);
    expect(primera.cuerpo.renglones[0]).toMatchObject({
      cantidad: '12.5000',
      unidadBaseNombre: 'Libra',
      costoUnitario: '2.400000',
    });
    const existencias = (await propietario().get(`/api/inventarios/existencias?articuloId=${articulo}`)).cuerpo;
    expect(existencias.map((f: { cantidad: string }) => f.cantidad)).toEqual(['13.5000']);
    expect(entradas.find((d) => d.documentoId === primera.cuerpo.id)).toMatchObject({
      empresaId: e.cuenta.empresaId,
      numero: 1,
      causa: 'produccion_propia',
      valorRazonableCentavos: null,
      renglones: [{ articuloId: articulo, cantidad: '12.5000', costoCentavos: 3000 }],
    });
  });

  it('exigen soporte y costo, y solo la donación recibida puede entrar a costo cero, con sus avisos', async () => {
    const articulo = await crearArticulo(propietario(), e.referencias);
    const base = { bodegaId: e.bodegaId, fecha: '2026-01-10', renglones: [{ articuloId: articulo, cantidad: '5' }] };

    const sinCosto = await entrada(propietario(), base);
    const sinSoporte = await propietario().post('/api/inventarios/entradas', {
      ...base,
      causa: 'aporte',
      soporte: '  ',
      renglones: [{ articuloId: articulo, cantidad: '5', costoTotal: '1.00' }],
    });
    const donacion = await entrada(propietario(), { ...base, causa: 'donacion_recibida' });

    expect(sinCosto.estado).toBe(400);
    expect(sinCosto.cuerpo.error.codigo).toBe('documento_invalido');
    expect(sinSoporte.estado).toBe(400);
    expect(donacion.estado).toBe(201);
    expect(donacion.cuerpo.avisos).toHaveLength(2);
    expect(donacion.cuerpo.avisos[1]).toContain('valor razonable');
    expect(entradas.find((d) => d.documentoId === donacion.cuerpo.id)).toMatchObject({
      causa: 'donacion_recibida',
      valorRazonableCentavos: 0,
    });
  });

  it('rechazan una fecha futura, una bodega o un artículo inactivos y lo que es de otra empresa', async () => {
    const articulo = await crearArticulo(propietario(), e.referencias);
    const inactivo = await crearArticulo(propietario(), e.referencias);
    const bodegaInactiva = await crearBodega(propietario());
    await propietario().put(`/api/inventarios/bodegas/${bodegaInactiva}`, {
      codigo: 'INACT',
      nombre: 'Bodega inactiva',
      localidadId: null,
      responsable: null,
      responsableUsuarioId: null,
      activo: false,
    });
    const articuloActual = (await propietario().get(`/api/inventarios/articulos/${inactivo}`)).cuerpo;
    await propietario().put(`/api/inventarios/articulos/${inactivo}`, { ...articuloActual, activo: false });
    const renglones = [{ articuloId: articulo, cantidad: '1', costoTotal: '1.00' }];
    const ajena = await darDeAltaCuenta(entorno, {
      nombre: 'Ajena kardex',
      usuario: 'propietarioajenokardex',
      modulos: ['terceros', 'libro-de-compras', 'inventarios'],
    });

    const futura = await entrada(propietario(), { bodegaId: e.bodegaId, fecha: '2999-01-01', renglones });
    const enBodegaInactiva = await entrada(propietario(), { bodegaId: bodegaInactiva, fecha: '2026-01-10', renglones });
    const conArticuloInactivo = await entrada(propietario(), {
      bodegaId: e.bodegaId,
      fecha: '2026-01-10',
      renglones: [{ articuloId: inactivo, cantidad: '1', costoTotal: '1.00' }],
    });
    const deOtraEmpresa = await entrada(ajena.propietario, { bodegaId: e.bodegaId, fecha: '2026-01-10', renglones });

    expect(futura.cuerpo.error.codigo).toBe('documento_invalido');
    expect(enBodegaInactiva.cuerpo.error.codigo).toBe('elemento_inactivo');
    expect(conArticuloInactivo.cuerpo.error.codigo).toBe('elemento_inactivo');
    expect(deOtraEmpresa.estado).toBe(404);
  });

  it('pasan a la unidad base lo escrito en quintales o en cajas con su conversión', async () => {
    const unidades = await unidadesPorNombre();
    const articulo = await crearArticulo(propietario(), e.referencias);
    const renglon = (unidadId: string) => [{ articuloId: articulo, cantidad: '2', unidadId, costoTotal: '40.00' }];
    const datos = (unidadId: string) => ({ bodegaId: e.bodegaId, fecha: '2026-01-10', renglones: renglon(unidadId) });

    const quintales = await entrada(propietario(), datos(unidades.get('Quintal')!));
    const sinConversion = await entrada(propietario(), datos(unidades.get('Caja')!));
    await propietario().put(`/api/inventarios/articulos/${articulo}/conversiones`, {
      conversiones: [{ unidadId: unidades.get('Caja')!, factor: '24', paraCompras: true }],
    });
    const cajas = await entrada(propietario(), datos(unidades.get('Caja')!));

    expect(quintales.cuerpo.renglones[0]).toMatchObject({ cantidad: '200.0000', cantidadEscrita: '2.0000' });
    expect(sinConversion.cuerpo.error.codigo).toBe('unidad_sin_conversion');
    expect(cajas.cuerpo.renglones[0]).toMatchObject({ cantidad: '48.0000', cantidadEscrita: '2.0000' });
  });

  it('con artículos que manejan lotes llevan el lote y las existencias se separan por lote', async () => {
    const articulo = await crearArticulo(propietario(), e.referencias, { manejaLotes: true });
    const otro = await crearArticulo(propietario(), e.referencias, { manejaLotes: true });
    const lote = (await propietario().post(`/api/inventarios/articulos/${articulo}/lotes`, { codigo: 'L-1' })).cuerpo
      .id;
    const loteAjeno = (await propietario().post(`/api/inventarios/articulos/${otro}/lotes`, { codigo: 'L-2' })).cuerpo
      .id;
    const renglon = (loteId?: string) => [{ articuloId: articulo, cantidad: '10', costoTotal: '20.00', loteId }];

    const sinLote = await entrada(propietario(), { bodegaId: e.bodegaId, fecha: '2026-01-10', renglones: renglon() });
    const deOtroArticulo = await entrada(propietario(), {
      bodegaId: e.bodegaId,
      fecha: '2026-01-10',
      renglones: renglon(loteAjeno),
    });
    const conLote = await entrada(propietario(), {
      bodegaId: e.bodegaId,
      fecha: '2026-01-10',
      renglones: renglon(lote),
    });
    const sacadoDelLote = await salida(propietario(), e, {
      bodegaId: e.bodegaId,
      fecha: '2026-01-11',
      renglones: [{ articuloId: articulo, cantidad: '4', loteId: lote }],
    });
    const demasiado = await salida(propietario(), e, {
      bodegaId: e.bodegaId,
      fecha: '2026-01-11',
      renglones: [{ articuloId: articulo, cantidad: '7', loteId: lote }],
    });

    expect(sinLote.cuerpo.error.codigo).toBe('lote_obligatorio');
    expect(deOtroArticulo.estado).toBe(404);
    expect(conLote.estado).toBe(201);
    expect(sacadoDelLote.cuerpo.renglones[0]).toMatchObject({ loteCodigo: 'L-1', costoTotal: '8.00' });
    expect(demasiado.cuerpo.error.codigo).toBe('existencia_negativa');
    const existencias = (await propietario().get(`/api/inventarios/existencias?articuloId=${articulo}`)).cuerpo;
    expect(existencias.map((f: { loteCodigo: string; cantidad: string }) => [f.loteCodigo, f.cantidad])).toEqual([
      ['L-1', '6.0000'],
    ]);
  });
});

describe('salidas por consumo', () => {
  it('toman el concepto de gasto del artículo si no se elige, calculan el costo y publican el evento', async () => {
    const articulo = await crearArticulo(propietario(), e.referencias);
    await entrada(propietario(), {
      bodegaId: e.bodegaId,
      fecha: '2026-02-01',
      renglones: [{ articuloId: articulo, cantidad: '10', costoTotal: '25.00' }],
    });

    const respuesta = await propietario().post('/api/inventarios/salidas', {
      fecha: '2026-02-02',
      bodegaId: e.bodegaId,
      destino: 'gasto',
      conceptoDeGastoId: null,
      localidadId: null,
      departamentoId: null,
      entregadoA: 'Juan',
      observaciones: null,
      renglones: [{ articuloId: articulo, cantidad: '4', loteId: null, unidadId: null, costoTotal: null }],
    });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      clase: 'salida_por_consumo',
      numero: expect.any(Number),
      destino: 'gasto',
      conceptoDeGastoId: e.referencias.conceptoDeGastoId,
      conceptoDeGastoNombre: 'Alimento para animales',
      entregadoA: 'Juan',
      costoTotal: '10.00',
    });
    expect(salidas.find((d) => d.documentoId === respuesta.cuerpo.id)).toMatchObject({
      destino: 'gasto',
      conceptoDeGastoId: e.referencias.conceptoDeGastoId,
      renglones: [{ cantidad: '4.0000', costoCentavos: 1000 }],
    });
  });

  it('rechazan un destino de Activos fijos (aún no disponible) y una salida mayor que la existencia', async () => {
    const articulo = await crearArticulo(propietario(), e.referencias);
    await entrada(propietario(), {
      bodegaId: e.bodegaId,
      fecha: '2026-02-01',
      renglones: [{ articuloId: articulo, cantidad: '3', costoTotal: '6.00' }],
    });
    const cuerpo = (destino: string, cantidad: string) => ({
      fecha: '2026-02-02',
      bodegaId: e.bodegaId,
      destino,
      conceptoDeGastoId: e.referencias.conceptoDeGastoId,
      localidadId: null,
      departamentoId: null,
      entregadoA: null,
      observaciones: null,
      renglones: [{ articuloId: articulo, cantidad, loteId: null, unidadId: null, costoTotal: null }],
    });

    const obra = await propietario().post('/api/inventarios/salidas', cuerpo('obra_de_activo_fijo', '1'));
    const demasiado = await propietario().post('/api/inventarios/salidas', cuerpo('gasto', '4'));

    expect(obra.cuerpo.error.codigo).toBe('destino_no_disponible');
    expect(demasiado.estado).toBe(422);
    expect(demasiado.cuerpo.error.codigo).toBe('existencia_negativa');
    const existencias = (await propietario().get(`/api/inventarios/existencias?articuloId=${articulo}`)).cuerpo;
    expect(existencias[0].cantidad).toBe('3.0000');
  });
});
