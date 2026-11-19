/**
 * Inventarios y el Libro de compras (INV-5): descartar una línea de la bandeja le quita la marca de inventario en el libro
 * (V-8) y devolverla se la vuelve a poner, con la auditoría de las dos partes; y el libro no anula ni elimina un documento
 * con recepciones, devoluciones o rebajas vigentes (R-1).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { RUTA_DOCUMENTOS, instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import {
  lineaDeInventario,
  marcaDeLaLinea,
  porRecibir,
  prepararRecepciones,
  recibir,
  registrarDocumento,
  registrarNotaDeCredito,
  renglonDeRecepcion,
  RUTA_POR_RECIBIR,
  RUTA_RECEPCIONES,
  type EscenarioDeRecepciones,
} from './soporte/escenario-de-recepciones.js';

const entorno = usarEntornoApi();
let e: EscenarioDeRecepciones;

const propietario = () => e.cuenta.propietario;
const idsDeLinea = async () => (await porRecibir(e)).map((linea) => linea.lineaId as string);
const descartar = (lineaId: string, motivo = 'Era gasto') =>
  propietario().post(`${RUTA_POR_RECIBIR}/${lineaId}/descartar`, { motivo });
const devolverALaBandeja = (lineaId: string) => propietario().post(`${RUTA_POR_RECIBIR}/${lineaId}/devolver`, {});
const auditoriaDe = (recurso: string, registroId: string) =>
  comoPropietario<{ accion: string; motivo: string | null; anterior: Record<string, any> }>(
    'select accion, motivo, anterior from core.auditoria where recurso = $1 and registro_id = $2 order by creado_en',
    [recurso, registroId],
  );

beforeAll(async () => {
  instalarDestinoFalso();
  e = await prepararRecepciones(entorno, 'recepcioneslibro');
});

afterAll(async () => {
  vi.restoreAllMocks();
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('descartar y devolver a la bandeja', () => {
  it('quita la marca de inventario en el libro, saca la línea de la bandeja y audita en los dos módulos', async () => {
    const { documentoId, lineaIds } = await registrarDocumento(e);

    const respuesta = await descartar(lineaIds[0]!, '  Era gasto  ');

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.avisos[0]).toContain('dejará de ser inventario');
    expect(await marcaDeLaLinea(lineaIds[0]!)).toBe(false);
    expect(await idsDeLinea()).not.toContain(lineaIds[0]);
    expect(await auditoriaDe('inventarios.recepciones', lineaIds[0]!)).toMatchObject([
      { accion: 'descartar', motivo: 'Era gasto', anterior: { costo: '1000.00' } },
    ]);
    expect(await auditoriaDe('libro-de-compras.documentos', documentoId)).toMatchObject([
      { accion: 'corregir', motivo: 'Era gasto', anterior: { lineaId: lineaIds[0], esInventario: true } },
    ]);
  });

  it('devolverla a la bandeja vuelve a poner la marca y deja el descarte como historia', async () => {
    const { documentoId, lineaIds } = await registrarDocumento(e);
    await descartar(lineaIds[0]!);

    const devuelta = await devolverALaBandeja(lineaIds[0]!);

    expect(devuelta.estado).toBe(204);
    expect(await marcaDeLaLinea(lineaIds[0]!)).toBe(true);
    expect(await idsDeLinea()).toContain(lineaIds[0]);
    const descartes = await comoPropietario<{ vigente: boolean; devuelto_por: string | null }>(
      'select vigente, devuelto_por from inventarios.descartes_de_lineas where linea_de_documento_id = $1',
      [lineaIds[0]],
    );
    expect(descartes).toEqual([{ vigente: false, devuelto_por: expect.any(String) }]);
    expect((await auditoriaDe('inventarios.recepciones', lineaIds[0]!)).map((a) => a.accion)).toEqual([
      'descartar',
      'devolver',
    ]);
    expect((await auditoriaDe('libro-de-compras.documentos', documentoId)).map((a) => a.accion)).toEqual([
      'corregir',
      'corregir',
    ]);
    expect((await devolverALaBandeja(lineaIds[0]!)).cuerpo.error.codigo).toBe('descarte_no_vigente');
  });

  it('una línea descartada no se recibe y descartar dos veces se rechaza', async () => {
    const { lineaIds } = await registrarDocumento(e);
    await descartar(lineaIds[0]!);

    const otra = await descartar(lineaIds[0]!);
    const recepcion = await recibir(e, [renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '1', monto: '10.00' })]);

    expect(otra.cuerpo.error.codigo).toBe('linea_descartada');
    expect(recepcion.cuerpo.error.codigo).toBe('linea_descartada');
  });

  it('el motivo es obligatorio y una línea con recepciones vigentes no se descarta hasta anularlas', async () => {
    const { lineaIds } = await registrarDocumento(e);
    const recepcion = await recibir(e, [renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '10', monto: '100.00' })]);

    const sinMotivo = await propietario().post(`${RUTA_POR_RECIBIR}/${lineaIds[0]}/descartar`, { motivo: '  ' });
    const conRecepcion = await descartar(lineaIds[0]!);
    await propietario().post(`${RUTA_RECEPCIONES}/${recepcion.cuerpo.documentos[0].id}/anular`, { motivo: 'Error' });
    const anulada = await descartar(lineaIds[0]!);

    expect(sinMotivo.estado).toBe(400);
    expect(conRecepcion.cuerpo.error.codigo).toBe('linea_con_recepciones');
    expect(anulada.estado).toBe(200);
  });

  it('una nota de crédito sin marca se descarta sin tocar el libro, y al devolverla no se le pone marca', async () => {
    const factura = await registrarDocumento(e);
    await recibir(e, [renglonDeRecepcion(e, factura.lineaIds[0]!, { cantidad: '10', monto: '100.00' })]);
    const nota = await registrarNotaDeCredito(e, factura.documentoId, '56.00');

    const descartada = await descartar(nota.lineaIds[0]!, 'La nota no va al inventario');
    await devolverALaBandeja(nota.lineaIds[0]!);

    expect(descartada.estado).toBe(200);
    expect(descartada.cuerpo.avisos).toEqual([]);
    expect(await marcaDeLaLinea(nota.lineaIds[0]!)).toBe(false);
    expect(await auditoriaDe('libro-de-compras.documentos', nota.documentoId)).toEqual([]);
  });

  it('una línea de un documento anulado no se descarta y no queda nada', async () => {
    const { documentoId, lineaIds } = await registrarDocumento(e);
    await propietario().post(`${RUTA_DOCUMENTOS}/${documentoId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Se registró por error',
    });

    const respuesta = await descartar(lineaIds[0]!);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('linea_no_recibible');
    const descartes = await comoPropietario(
      'select 1 from inventarios.descartes_de_lineas where linea_de_documento_id = $1',
      [lineaIds[0]],
    );
    expect(descartes).toEqual([]);
  });

  it('si el libro rechaza volver a poner la marca (la línea pasó a ser activo fijo) todo se deshace', async () => {
    const { documentoId, lineaIds } = await registrarDocumento(e);
    await descartar(lineaIds[0]!);
    await comoPropietario('update libro_de_compras.lineas_de_documento set es_activo_fijo = true where id = $1', [
      lineaIds[0],
    ]);

    const respuesta = await devolverALaBandeja(lineaIds[0]!);

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('linea_con_dos_destinos_del_costo');
    expect(await marcaDeLaLinea(lineaIds[0]!)).toBe(false);
    const vigentes = await comoPropietario<{ vigente: boolean }>(
      'select vigente from inventarios.descartes_de_lineas where linea_de_documento_id = $1',
      [lineaIds[0]],
    );
    expect(vigentes).toEqual([{ vigente: true }]);
    expect((await auditoriaDe('libro-de-compras.documentos', documentoId)).map((a) => a.accion)).toEqual(['corregir']);
  });
});

describe('el libro no da de baja lo que tiene movimientos de Inventarios (R-1)', () => {
  it('no anula ni elimina un documento con recepciones vigentes, y dice cuáles; anuladas, sí', async () => {
    const { documentoId, lineaIds } = await registrarDocumento(e);
    const recepcion = await recibir(e, [renglonDeRecepcion(e, lineaIds[0]!, { cantidad: '10', monto: '100.00' })]);
    const numero = recepcion.cuerpo.documentos[0].numero;
    const anular = () =>
      propietario().post(`${RUTA_DOCUMENTOS}/${documentoId}/anular`, { causa: 'error_de_captura', motivo: 'Error' });

    const anulando = await anular();
    const eliminando = await propietario().delete(`${RUTA_DOCUMENTOS}/${documentoId}`);
    await propietario().post(`${RUTA_RECEPCIONES}/${recepcion.cuerpo.documentos[0].id}/anular`, { motivo: 'Error' });
    const despues = await anular();

    expect(anulando.cuerpo.error).toMatchObject({ codigo: 'documento_con_recepciones' });
    expect(anulando.cuerpo.error.mensaje).toContain(`Recepción ${numero}`);
    expect(eliminando.cuerpo.error.codigo).toBe('documento_con_recepciones');
    expect(despues.estado).toBe(200);
  });

  it('no anula la nota de crédito mientras tenga devoluciones o rebajas vigentes', async () => {
    const factura = await registrarDocumento(e);
    await recibir(e, [renglonDeRecepcion(e, factura.lineaIds[0]!, { cantidad: '10', monto: '100.00' })]);
    const nota = await registrarNotaDeCredito(e, factura.documentoId, '56.00');
    const rebaja = await propietario().post('/api/inventarios/rebajas-de-costo', {
      fecha: new Date().toLocaleDateString('sv', { timeZone: 'America/Guatemala' }),
      lineaId: nota.lineaIds[0],
      monto: '10.00',
      base: 'cantidad',
    });
    const anular = () =>
      propietario().post(`${RUTA_DOCUMENTOS}/${nota.documentoId}/anular`, {
        causa: 'error_de_captura',
        motivo: 'Error',
      });

    const bloqueada = await anular();
    await propietario().post(`/api/inventarios/rebajas-de-costo/${rebaja.cuerpo.id}/anular`, { motivo: 'Error' });
    const libre = await anular();

    expect(rebaja.estado, JSON.stringify(rebaja.cuerpo)).toBe(201);
    expect(bloqueada.cuerpo.error.codigo).toBe('documento_con_recepciones');
    expect(libre.estado).toBe(200);
  });

  it('un documento sin movimientos de Inventarios se anula y se elimina como siempre', async () => {
    const { documentoId } = await registrarDocumento(e, { lineas: [lineaDeInventario(e, '224.00')] });

    const eliminado = await propietario().delete(`${RUTA_DOCUMENTOS}/${documentoId}`);

    expect(eliminado.estado).toBe(200);
  });
});
