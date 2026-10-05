import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import '../modulos/core/contratos/libro-de-compras.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  documentoDePrueba,
  instalarDestinoFalso,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type DestinoFalso,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let destino: DestinoFalso;
const eventos: Array<{ evento: string; documentoId: string; estadoAlPublicar: string | null }> = [];

const propietario = () => escenario.cuenta.propietario;
const registrar = async (cambios: Record<string, unknown> = {}) => {
  const respuesta = await propietario().post(RUTA_DOCUMENTOS, documentoDePrueba(escenario, cambios));
  expect(respuesta.estado).toBe(201);
  return respuesta.cuerpo.documento.id as string;
};
const anular = (id: string, motivo = 'Se registró por error') =>
  propietario().post(`${RUTA_DOCUMENTOS}/${id}/anular`, { causa: 'error_de_captura', motivo });
const eliminar = (id: string) => propietario().delete(`${RUTA_DOCUMENTOS}/${id}`);
const filasDe = (tabla: string, id: string) =>
  consultar(`select 1 from libro_de_compras.${tabla} where documento_id = $1`, [id]);
const auditados = (id: string) =>
  consultar<{ accion: string; motivo: string | null; anterior: { estado: string; lineas: unknown[]; numero: string } }>(
    "select accion, motivo, anterior from core.auditoria where recurso = 'libro-de-compras.documentos' and registro_id = $1",
    [id],
  );
const estadoEnLaBase = async (id: string) =>
  (await consultar<{ estado: string }>('select estado from libro_de_compras.documentos where id = $1', [id]))[0]
    ?.estado ?? null;

beforeAll(async () => {
  destino = instalarDestinoFalso();
  for (const evento of ['documento_anulado', 'documento_eliminado'] as const) {
    busEventos.suscribir(`libro-de-compras.${evento}`, async ({ documentoId }) => {
      eventos.push({ evento, documentoId, estadoAlPublicar: await estadoEnLaBase(documentoId) });
    });
  }
  escenario = await prepararEscenario(entorno, 'bajasdocumentos');
});

afterAll(() => vi.restoreAllMocks());

describe('anular un documento', () => {
  it('lo deja anulado con su motivo y usuario, avisa al destino y libera el número', async () => {
    const solicitud = documentoDePrueba(escenario);
    const registrado = await propietario().post(RUTA_DOCUMENTOS, solicitud);
    const id = registrado.cuerpo.documento.id as string;
    expect((await propietario().post(RUTA_DOCUMENTOS, solicitud)).estado).toBe(409);

    const respuesta = await anular(id, '  Factura duplicada  ');

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.avisos).toEqual([]);
    expect(respuesta.cuerpo.documento).toMatchObject({
      id,
      estado: 'anulado',
      motivoDeAnulacion: 'Factura duplicada',
      causaDeAnulacion: 'error_de_captura',
      puedeAnular: false,
      puedeEliminar: false,
    });
    expect(destino.avisosDeBaja.at(-1)).toEqual({ aviso: 'anular', documentoId: id, motivo: 'Factura duplicada' });
    const [fila] = await consultar<{ anulado_por: string; anulado_en: Date }>(
      'select anulado_por, anulado_en from libro_de_compras.documentos where id = $1',
      [id],
    );
    expect(fila?.anulado_por).toEqual(expect.any(String));
    expect(fila?.anulado_en).toBeInstanceOf(Date);
    expect((await propietario().post(RUTA_DOCUMENTOS, solicitud)).estado).toBe(201);
  });

  it('exige el motivo y no se anula dos veces', async () => {
    const id = await registrar();

    const sinMotivo = await propietario().post(`${RUTA_DOCUMENTOS}/${id}/anular`, {
      causa: 'error_de_captura',
      motivo: '   ',
    });
    const muyLargo = await anular(id, 'x'.repeat(301));
    await anular(id);
    const otraVez = await anular(id);

    expect(sinMotivo.estado).toBe(400);
    expect(muyLargo.cuerpo.error.codigo).toBe('motivo_de_anulacion_invalido');
    expect(otraVez.estado).toBe(422);
    expect(otraVez.cuerpo.error.codigo).toBe('documento_ya_anulado');
  });

  it('una factura con notas vigentes no se anula hasta que se anulen sus notas', async () => {
    const factura = await registrar();
    const nota = await registrar({ tipo: 'nota_de_credito', documentoAfectadoId: factura, serie: 'N' });

    const bloqueada = await anular(factura);
    await anular(nota);
    const liberada = await anular(factura);

    expect(bloqueada.cuerpo.error.codigo).toBe('documento_con_notas_vigentes');
    expect(liberada.estado).toBe(200);
  });

  it('queda en la auditoría con la ficha tal como estaba y el motivo', async () => {
    const id = await registrar({ numero: 'AUDITADO-1' });

    await anular(id, 'Error de digitación');

    const [entrada] = await auditados(id);
    expect(entrada).toMatchObject({ accion: 'anular', motivo: 'error_de_captura: Error de digitación' });
    expect(entrada?.anterior).toMatchObject({ estado: 'vigente', numero: 'AUDITADO-1' });
    expect(entrada?.anterior.lineas).toHaveLength(1);
  });

  it('si el destino lo rechaza, no cambia nada: ni el estado, ni la auditoría, ni el evento', async () => {
    const id = await registrar();
    const eventosAntes = eventos.length;
    destino.rechazarBajas = true;

    const rechazada = await anular(id);
    destino.rechazarBajas = false;

    expect(rechazada.estado).toBe(422);
    expect(rechazada.cuerpo.error.codigo).toBe('destino_rechaza');
    expect(await estadoEnLaBase(id)).toBe('vigente');
    expect(await auditados(id)).toHaveLength(0);
    expect(eventos).toHaveLength(eventosAntes);
  });

  it('el evento sale solo después de confirmar: el documento ya está anulado cuando llega', async () => {
    const id = await registrar();

    await anular(id);

    expect(eventos.at(-1)).toEqual({ evento: 'documento_anulado', documentoId: id, estadoAlPublicar: 'anulado' });
  });

  it('uno que no existe responde 404', async () => {
    expect((await anular(crypto.randomUUID())).estado).toBe(404);
  });

  it('un documento procesado en el destino también se anula (el destino revierte lo suyo)', async () => {
    const id = await registrar();
    await consultar('update libro_de_compras.documentos set procesado_en_destino_en = now() where id = $1', [id]);

    const respuesta = await anular(id);

    expect(respuesta.estado).toBe(200);
  });
});

describe('eliminar un documento', () => {
  it('borra lo limpio con sus líneas y retenciones, avisa al destino, lo audita y publica el evento', async () => {
    const id = await registrar({ numero: 'ELIMINAR-1' });

    const respuesta = await eliminar(id);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toEqual({ avisos: [] });
    expect(await estadoEnLaBase(id)).toBeNull();
    expect(await filasDe('lineas_de_documento', id)).toHaveLength(0);
    expect(await filasDe('retenciones', id)).toHaveLength(0);
    expect(destino.avisosDeBaja.at(-1)).toEqual({ aviso: 'eliminar', documentoId: id, motivo: undefined });
    const [entrada] = await auditados(id);
    expect(entrada).toMatchObject({ accion: 'eliminar' });
    expect(entrada?.anterior).toMatchObject({ estado: 'vigente', numero: 'ELIMINAR-1' });
    expect(eventos.at(-1)).toEqual({ evento: 'documento_eliminado', documentoId: id, estadoAlPublicar: null });
    expect((await eliminar(id)).estado).toBe(404);
  });

  it('uno procesado en el destino no se elimina', async () => {
    const id = await registrar();
    await consultar('update libro_de_compras.documentos set procesado_en_destino_en = now() where id = $1', [id]);

    const respuesta = await eliminar(id);

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('documento_procesado_en_el_destino');
    expect(await estadoEnLaBase(id)).toBe('vigente');
  });

  it('una factura con notas no se elimina, ni siquiera si sus notas están anuladas', async () => {
    const factura = await registrar();
    const nota = await registrar({ tipo: 'nota_de_credito', documentoAfectadoId: factura, serie: 'N' });
    await anular(nota);

    const respuesta = await eliminar(factura);

    expect(respuesta.cuerpo.error.codigo).toBe('documento_con_notas');
    expect((await eliminar(nota)).cuerpo.error.codigo).toBe('documento_ya_anulado');
  });

  it('si el destino lo rechaza, no se borra nada ni se audita', async () => {
    const id = await registrar();
    destino.rechazarBajas = true;

    const rechazada = await eliminar(id);
    destino.rechazarBajas = false;

    expect(rechazada.cuerpo.error.codigo).toBe('destino_rechaza');
    expect(await estadoEnLaBase(id)).toBe('vigente');
    expect(await auditados(id)).toHaveLength(0);
  });
});
