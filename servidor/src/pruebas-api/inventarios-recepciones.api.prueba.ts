/**
 * Bandeja «Por recibir» y recepciones (INV-5): qué líneas del libro entran, recibir completo y en partes, el costo del
 * kardex, los lotes nuevos, el candado de la línea con dos recepciones a la vez, los permisos y las bodegas ajenas.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '../modulos/core/contratos/inventarios.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { RUTA_DOCUMENTOS, instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import { crearArticulo, crearBodega, kardexDe } from './soporte/escenario-de-kardex.js';
import {
  lineaDeInventario,
  porRecibir,
  RUTA_RECEPCIONES,
  prepararRecepciones,
  recibir,
  registrarDocumento,
  renglonDeRecepcion,
  type EscenarioDeRecepciones,
} from './soporte/escenario-de-recepciones.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDeRecepciones;
const entradas: Array<Record<string, any>> = [];

const propietario = () => e.cuenta.propietario;
const idsDeLinea = async (consulta = '') => (await porRecibir(e, consulta)).map((linea) => linea.lineaId as string);

beforeAll(async () => {
  instalarDestinoFalso();
  busEventos.suscribir('inventarios.entrada_registrada', (datos) => {
    entradas.push(datos);
  });
  e = await prepararRecepciones(entorno, 'recepciones');
});

afterAll(async () => {
  vi.restoreAllMocks();
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('qué entra a la bandeja', () => {
  it('las líneas marcadas como inventario de documentos vigentes, con su costo, proveedor y concepto', async () => {
    const { lineaIds } = await registrarDocumento(e, {
      lineas: [lineaDeInventario(e), { conceptoId: e.referencias.conceptoDeGastoId, total: '500.00' }],
    });

    const lineas = await porRecibir(e);

    const linea = lineas.find((l) => l.lineaId === lineaIds[0]);
    expect(linea).toMatchObject({
      tipoDeDocumento: 'factura',
      proveedorNombre: 'Veterinaria El Quiroa',
      conceptoNombre: 'Alimento para ganado',
      descripcion: 'Concentrado',
      costo: '1000.00',
      recibido: '0.00',
      pendiente: '1000.00',
      articuloSugeridoId: null,
      anteriorALaFechaDeInicio: false,
    });
    expect(lineas.map((l) => l.lineaId)).not.toContain(lineaIds[1]);
  });

  it('un documento anulado sale de la bandeja', async () => {
    const { documentoId, lineaIds } = await registrarDocumento(e);
    expect(await idsDeLinea()).toContain(lineaIds[0]);

    const anulado = await propietario().post(`${RUTA_DOCUMENTOS}/${documentoId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Se registró por error',
    });

    expect(anulado.estado).toBe(200);
    expect(await idsDeLinea()).not.toContain(lineaIds[0]);
  });

  it('filtra por concepto y por período', async () => {
    const { lineaIds } = await registrarDocumento(e);

    const porConcepto = await idsDeLinea(`?conceptoId=${e.conceptoDeInventarioId}`);
    const otroConcepto = await idsDeLinea(`?conceptoId=${e.referencias.conceptoDeGastoId}`);
    const fueraDePeriodo = await idsDeLinea('?hasta=2020-01-01');

    expect(porConcepto).toContain(lineaIds[0]);
    expect(otroConcepto).toEqual([]);
    expect(fueraDePeriodo).toEqual([]);
  });
});

describe('recibir', () => {
  it('guarda la recepción con el costo de la línea, mueve el kardex y saca la línea de la bandeja', async () => {
    const { documentoId, lineaIds } = await registrarDocumento(e);

    const respuesta = await recibir(e, [renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '500', monto: '1000.00' })]);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    const [documento] = respuesta.cuerpo.documentos;
    expect(documento).toMatchObject({
      clase: 'recepcion_de_compra',
      documentoDeCompraId: documentoId,
      bodegaId: e.bodegaId,
      costoTotal: '1000.00',
    });
    expect(documento.renglones[0]).toMatchObject({ cantidad: '500.0000', costoUnitario: '2.000000' });
    expect(await idsDeLinea()).not.toContain(lineaIds[0]);
    const kardex = await kardexDe(propietario(), e.articuloId);
    expect(kardex.renglones.at(-1)).toMatchObject({ clase: 'recepcion_de_compra', saldoValor: '1000.00' });
    expect(entradas.find((d) => d.documentoId === documento.id)).toMatchObject({
      causa: 'compra',
      documentoDeCompraId: documentoId,
      renglones: [{ lineaDeCompraId: lineaIds[0], costoCentavos: 100_000 }],
    });
  });

  it('en partes deja el pendiente en la bandeja y propone el artículo recibido; una parte de más se rechaza', async () => {
    const { lineaIds } = await registrarDocumento(e);
    await recibir(e, [renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '100', monto: '300.00' })]);

    const linea = (await porRecibir(e)).find((l) => l.lineaId === lineaIds[0]);
    const demasiado = await recibir(e, [renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '1', monto: '700.01' })]);
    const resto = await recibir(e, [renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '1', monto: '700.00' })]);

    expect(linea).toMatchObject({ costo: '1000.00', recibido: '300.00', pendiente: '700.00' });
    expect(demasiado.estado).toBe(422);
    expect(demasiado.cuerpo.error).toMatchObject({ codigo: 'linea_sobrerrecibida' });
    expect(resto.estado).toBe(201);
    expect(await idsDeLinea()).not.toContain(lineaIds[0]);
    const otra = await registrarDocumento(e);
    expect((await porRecibir(e)).find((l) => l.lineaId === otra.lineaIds[0])).toMatchObject({
      articuloSugeridoId: e.articuloId,
    });
  });

  it('crea una recepción por documento del libro, en una sola solicitud', async () => {
    const primera = await registrarDocumento(e);
    const segunda = await registrarDocumento(e);

    const respuesta = await recibir(e, [
      renglonDeRecepcion(e, primera.lineaIds[0]!, { cantidad: '10', monto: '1000.00' }),
      renglonDeRecepcion(e, segunda.lineaIds[0]!, { cantidad: '10', monto: '500.00' }),
    ]);

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.documentos.map((d: { documentoDeCompraId: string }) => d.documentoDeCompraId)).toEqual([
      primera.documentoId,
      segunda.documentoId,
    ]);
  });

  it('crea el lote nuevo al recibir un artículo que maneja lotes, con su vencimiento', async () => {
    const articulo = await crearArticulo(propietario(), e.referencias, { manejaLotes: true, manejaVencimiento: true });
    const { lineaIds } = await registrarDocumento(e);
    const renglon = renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '10', monto: '100.00', articuloId: articulo });

    const sinVencimiento = await recibir(e, [{ ...renglon, loteNuevo: { codigo: 'L-1' } }]);
    const bien = await recibir(e, [{ ...renglon, loteNuevo: { codigo: 'L-1', fechaDeVencimiento: '2030-01-31' } }]);

    expect(sinVencimiento.estado).toBe(400);
    expect(bien.estado, JSON.stringify(bien.cuerpo)).toBe(201);
    expect(bien.cuerpo.documentos[0].renglones[0]).toMatchObject({ loteCodigo: 'L-1' });
  });

  it('rechaza lo que el libro no deja recibir: una línea sin marca, un servicio y una línea ajena', async () => {
    const sinMarca = await registrarDocumento(e, {
      lineas: [{ conceptoId: e.referencias.conceptoDeGastoId, total: '112.00' }],
    });

    const respuesta = await recibir(e, [
      renglonDeRecepcion(e, sinMarca.lineaIds[0]!, { cantidad: '1', monto: '10.00' }),
    ]);
    const fantasma = await recibir(e, [renglonDeRecepcion(e, crypto.randomUUID(), { cantidad: '1', monto: '10.00' })]);

    expect(respuesta.cuerpo.error.codigo).toBe('linea_no_recibible');
    expect(fantasma.cuerpo.error.codigo).toBe('linea_no_recibible');
  });

  it('dos recepciones a la vez de la misma línea no pasan de su costo: una entra y la otra se rechaza', async () => {
    const { lineaIds } = await registrarDocumento(e);
    const una = () => recibir(e, [renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '60', monto: '600.00' })]);

    const [a, b] = await Promise.all([una(), una()]);

    expect([a.estado, b.estado].sort()).toEqual([201, 422]);
    expect([a, b].find((r) => r.estado === 422)!.cuerpo.error.codigo).toBe('linea_sobrerrecibida');
  });
});

describe('permisos y bodegas', () => {
  it('ver la bandeja, recibir y anular tienen cada uno su permiso', async () => {
    const { lineaIds } = await registrarDocumento(e);
    const lector = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Lector',
      apellidos: 'Recepciones',
      permisos: ['inventarios.recepciones.ver'],
    });

    const lista = await lector.get('/api/inventarios/por-recibir');
    const recepcion = await lector.post('/api/inventarios/recepciones', {
      fecha: '2026-01-10',
      bodegaId: e.bodegaId,
      renglones: [renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '1', monto: '1.00' })],
    });
    const anular = await lector.post(`/api/inventarios/recepciones/${crypto.randomUUID()}/anular`, { motivo: 'x' });
    const descartar = await lector.post(`/api/inventarios/por-recibir/${lineaIds[0]}/descartar`, { motivo: 'x' });

    expect(lista.estado).toBe(200);
    expect([recepcion.estado, anular.estado, descartar.estado]).toEqual([403, 403, 403]);
  });

  it('las recepciones de una factura se ven con el permiso de recibir, solo las de esa factura y vigentes', async () => {
    const propia = await registrarDocumento(e);
    const otra = await registrarDocumento(e);
    const recibida = await recibir(e, [renglonDeRecepcion(e, propia.lineaIds[0]!, { cantidad: '5', monto: '100.00' })]);
    await recibir(e, [renglonDeRecepcion(e, otra.lineaIds[0]!, { cantidad: '5', monto: '100.00' })]);
    const operador = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Operador',
      apellidos: 'Recibe',
      permisos: ['inventarios.recepciones.crear'],
    });
    const permisos = ['inventarios.recepciones.ver'];
    const lector = await crearUsuarioConPermisos(entorno, e.cuenta, { nombres: 'Ana', apellidos: 'Lee', permisos });
    const id = (await operador.get('/api/sesion')).cuerpo.usuario.id;
    await propietario().put(`/api/inventarios/bodegas/accesos/${id}`, { bodegaIds: [e.bodegaId] });

    const consulta = `${RUTA_RECEPCIONES}?documentoDeCompraId=${propia.documentoId}`;
    const vistas = await operador.get(consulta);
    const sinPermiso = await lector.get(consulta);

    expect(vistas.estado, JSON.stringify(vistas.cuerpo)).toBe(200);
    expect(vistas.cuerpo.map((d: { id: string }) => d.id)).toEqual([recibida.cuerpo.documentos[0].id]);
    expect(sinPermiso.estado).toBe(403);
  });

  it('una bodega que el usuario no tiene asignada no se ve: la recepción se rechaza y su documento no se ve', async () => {
    const ajena = await crearBodega(propietario());
    const { lineaIds } = await registrarDocumento(e);
    const jefe = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Jefe',
      apellidos: 'Recepciones',
      permisos: ['inventarios.bodegas.asignar', 'inventarios.bodegas.ver'],
    });
    const bodeguero = await crearUsuarioConPermisos(entorno, e.cuenta, {
      nombres: 'Bodeguero',
      apellidos: 'Recepciones',
      permisos: ['inventarios.recepciones.ver', 'inventarios.recepciones.crear', 'inventarios.existencias.ver'],
    });
    const id = (await bodeguero.get('/api/sesion')).cuerpo.usuario.id as string;
    await jefe.put(`/api/inventarios/bodegas/accesos/${id}`, { bodegaIds: [e.bodegaId] });

    const aAjena = await bodeguero.post('/api/inventarios/recepciones', {
      fecha: new Date().toLocaleDateString('sv', { timeZone: 'America/Guatemala' }),
      bodegaId: ajena,
      renglones: [renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '1', monto: '10.00' })],
    });
    const propia = await bodeguero.post('/api/inventarios/recepciones', {
      fecha: new Date().toLocaleDateString('sv', { timeZone: 'America/Guatemala' }),
      bodegaId: e.bodegaId,
      renglones: [renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '1', monto: '10.00' })],
    });
    const detalle = await propietario().post('/api/inventarios/recepciones', {
      fecha: new Date().toLocaleDateString('sv', { timeZone: 'America/Guatemala' }),
      bodegaId: ajena,
      renglones: [renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '1', monto: '10.00' })],
    });

    expect(aAjena.estado).toBe(404);
    expect(propia.estado).toBe(201);
    expect(detalle.estado).toBe(201);
    const id2 = detalle.cuerpo.documentos[0].id;
    expect((await bodeguero.get(`/api/inventarios/documentos/${id2}`)).estado).toBe(404);
  });
});

describe('aislamiento entre cuentas', () => {
  it('otra cuenta no ve las líneas de esta ni puede recibirlas', async () => {
    const ajena = await prepararRecepciones(entorno, 'recepcionesajena');
    const { lineaIds } = await registrarDocumento(e);

    const lineasAjenas = await porRecibir(ajena);
    const recepcion = await recibir(ajena, [
      renglonDeRecepcion(ajena, lineaIds[0]!, { cantidad: '1', monto: '10.00' }),
    ]);
    const descarte = await ajena.cuenta.propietario.post(`/api/inventarios/por-recibir/${lineaIds[0]}/descartar`, {
      motivo: 'No es mía',
    });

    expect(lineasAjenas.map((l) => l.lineaId)).not.toContain(lineaIds[0]);
    expect(recepcion.cuerpo.error.codigo).toBe('linea_no_recibible');
    expect(descarte.cuerpo.error.codigo).toBe('linea_no_recibible');
    expect(await idsDeLinea()).toContain(lineaIds[0]);
  });
});
