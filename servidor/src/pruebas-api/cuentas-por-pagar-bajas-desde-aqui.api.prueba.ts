import { beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/cuentas-por-pagar.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import {
  consultar,
  haceDias,
  prepararEscenario,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const RUTA = '/api/cuentas-por-pagar/documentos';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;
let sinPermisos: ClienteApi;
const anulados: Array<{ documentoId: string; estabaAutorizado: boolean }> = [];

const propietario = () => escenario.cuenta.propietario;
const idAqui = async (documentoDeCompraId: string) => (await documentos.fila(documentoDeCompraId))!.id;
const anular = (id: string, motivo = 'Se registró por error', cliente = propietario()) =>
  cliente.post(`${RUTA}/${id}/anular`, { causa: 'error_de_captura', motivo });
const eliminar = (id: string, cliente = propietario()) => cliente.delete(`${RUTA}/${id}`);
const estadoEnLibro = async (id: string) =>
  (await consultar<{ estado: string }>('select estado from libro_de_compras.documentos where id = $1', [id]))[0]
    ?.estado;
const existeEnLibro = async (id: string) =>
  (await consultar('select 1 from libro_de_compras.documentos where id = $1', [id])).length === 1;
const auditoriaDe = (accion: string, registroId: string) =>
  consultar<{ motivo: string | null; anterior: Record<string, unknown> }>(
    'select motivo, anterior from core.auditoria where recurso = $1 and accion = $2 and registro_id = $3',
    ['cuentas-por-pagar.documentos', accion, registroId],
  );
const completarYAutorizar = async (id: string) => {
  const unaPersona = await propietario().post(`${RUTA}/registrar`, { documentos: [{ id }] });
  expect(unaPersona.estado).toBe(200);
  const autorizada = await propietario().post(`${RUTA}/autorizar`, { ids: [id] });
  expect(autorizada.estado, JSON.stringify(autorizada.cuerpo)).toBe(200);
};

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpbajasaqui', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, haceDias(3));
  sinPermisos = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo',
    apellidos: 'Mira',
    permisos: ['cuentas-por-pagar.documentos.ver'],
  });
  busEventos.suscribir('cuentas-por-pagar.documento_anulado', async (datos) => {
    anulados.push({ documentoId: datos.documentoDeCompraId, estabaAutorizado: datos.estabaAutorizado });
  });
});

describe('anular desde Cuentas por pagar', () => {
  it('anula aquí y en Libro de compras, audita como estaba y publica el evento', async () => {
    const libroId = await documentos.registrar();
    const id = await idAqui(libroId);

    const respuesta = await anular(id, 'Duplicada');

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ id, estado: 'anulado', puedeAnular: false });
    expect(await documentos.fila(libroId)).toMatchObject({
      estado: 'anulado',
      motivo_de_anulacion: 'Duplicada',
      estaba_autorizado: false,
    });
    expect(await estadoEnLibro(libroId)).toBe('anulado');
    const [auditado] = await auditoriaDe('anular', id);
    expect(auditado).toMatchObject({ motivo: 'Duplicada', anterior: { id, estado: 'pendiente', total: '1120.00' } });
    expect(anulados).toContainEqual({ documentoId: libroId, estabaAutorizado: false });
  });

  it('la ficha de un documento anulado dice la causa, el motivo, quién y cuándo; la de uno vigente, nada', async () => {
    const libroId = await documentos.registrar();
    const id = await idAqui(libroId);
    expect((await propietario().get(`${RUTA}/${id}`)).cuerpo.anulacion).toBeNull();

    await anular(id, 'Duplicada');
    const ficha = (await propietario().get(`${RUTA}/${id}`)).cuerpo;

    expect(ficha.anulacion).toMatchObject({ causa: 'error_de_captura', motivo: 'Duplicada' });
    expect(ficha.anulacion.anuladoPor).toEqual(expect.any(String));
    expect(ficha.anulacion.anuladoPorNombre).toEqual(expect.stringMatching(/\S+/));
    expect(Number.isNaN(Date.parse(ficha.anulacion.anuladoEn))).toBe(false);
  });

  it('un documento autorizado se anula y el evento dice que estaba autorizado', async () => {
    const libroId = await documentos.registrar();
    const id = await idAqui(libroId);
    await completarYAutorizar(id);

    const respuesta = await anular(id);

    expect(respuesta.estado).toBe(200);
    expect(await documentos.fila(libroId)).toMatchObject({ estado: 'anulado', estaba_autorizado: true });
    expect(anulados).toContainEqual({ documentoId: libroId, estabaAutorizado: true });
  });

  it('anular una nota de crédito borra sus aplicaciones', async () => {
    const facturaId = await documentos.registrar();
    const notaId = await documentos.registrarNota('NCRE', facturaId, { total: '336.00' });
    expect(await documentos.aplicacionesDe(notaId)).toHaveLength(1);

    const respuesta = await anular(await idAqui(notaId));

    expect(respuesta.estado).toBe(200);
    expect(await documentos.aplicacionesDe(notaId)).toEqual([]);
  });

  it('una factura con notas vigentes no se anula: primero las notas', async () => {
    const facturaId = await documentos.registrar();
    await documentos.registrarNota('NCRE', facturaId, { total: '336.00' });

    const respuesta = await anular(await idAqui(facturaId));

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('documento_con_notas_vigentes');
    expect((await documentos.fila(facturaId))?.estado).toBe('pendiente');
  });

  it('rechaza lo ya anulado, el motivo vacío, una causa desconocida y a quien no tiene el permiso', async () => {
    const libroId = await documentos.registrar();
    const id = await idAqui(libroId);

    const sinMotivo = await anular(id, '  ');
    const sinCausa = await propietario().post(`${RUTA}/${id}/anular`, { causa: 'porque_si', motivo: 'x' });
    const sinPermiso = await anular(id, 'x', sinPermisos);
    await anular(id);
    const repetida = await anular(id);

    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_invalido');
    expect(sinCausa.estado).toBe(400);
    expect(sinPermiso.estado).toBe(403);
    expect(repetida.cuerpo.error.codigo).toBe('documento_ya_anulado');
    expect((await anular(crypto.randomUUID())).estado).toBe(404);
  });

  it('si Libro de compras rechaza la anulación (ya la anuló), Cuentas por pagar no cambia', async () => {
    const libroId = await documentos.registrar();
    const id = await idAqui(libroId);
    await consultar(
      `update libro_de_compras.documentos set estado = 'anulado', anulado_en = now(), anulado_por = creado_por,
              motivo_de_anulacion = 'x', causa_de_anulacion = 'error_de_captura' where id = $1`,
      [libroId],
    );

    const respuesta = await anular(id);

    expect(respuesta.estado).toBe(422);
    expect((await documentos.fila(libroId))?.estado).toBe('pendiente');
    expect(await auditoriaDe('anular', id)).toEqual([]);
  });
});

describe('eliminar desde Cuentas por pagar', () => {
  it('elimina un pendiente aquí y en Libro de compras y lo audita como estaba', async () => {
    const libroId = await documentos.registrar();
    const id = await idAqui(libroId);

    const respuesta = await eliminar(id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(204);
    expect(await documentos.fila(libroId)).toBeUndefined();
    expect(await existeEnLibro(libroId)).toBe(false);
    const [auditado] = await auditoriaDe('eliminar', id);
    expect(auditado).toMatchObject({ anterior: { id, estado: 'pendiente', total: '1120.00' } });
  });

  it('elimina uno completado y una nota de crédito: sus aplicaciones se van con ella', async () => {
    const facturaId = await documentos.registrar();
    const notaId = await documentos.registrarNota('NCRE', facturaId, { total: '336.00' });
    const completado = await documentos.registrar();
    await propietario().post(`${RUTA}/registrar`, { documentos: [{ id: await idAqui(completado) }] });

    const nota = await eliminar(await idAqui(notaId));
    const completada = await eliminar(await idAqui(completado));

    expect(nota.estado).toBe(204);
    expect(completada.estado).toBe(204);
    expect(await documentos.aplicacionesDe(notaId)).toEqual([]);
    expect(await existeEnLibro(notaId)).toBe(false);
  });

  it('no elimina lo autorizado, lo anulado ni una factura con notas, y nada cambia', async () => {
    const autorizadoId = await documentos.registrar();
    await completarYAutorizar(await idAqui(autorizadoId));
    const anuladoId = await documentos.registrar();
    await anular(await idAqui(anuladoId));
    const facturaId = await documentos.registrar();
    await documentos.registrarNota('NCRE', facturaId, { total: '336.00' });

    const autorizado = await eliminar(await idAqui(autorizadoId));
    const anulado = await eliminar(await idAqui(anuladoId));
    const conNotas = await eliminar(await idAqui(facturaId));

    expect(autorizado.cuerpo.error.codigo).toBe('documento_autorizado');
    expect(anulado.cuerpo.error.codigo).toBe('documento_no_eliminable');
    expect(conNotas.cuerpo.error.codigo).toBe('documento_con_notas');
    for (const id of [autorizadoId, anuladoId, facturaId]) expect(await existeEnLibro(id)).toBe(true);
  });

  it('pide su permiso y responde no encontrado a lo que no existe', async () => {
    const libroId = await documentos.registrar();

    expect((await eliminar(await idAqui(libroId), sinPermisos)).estado).toBe(403);
    expect((await eliminar(crypto.randomUUID())).estado).toBe(404);
    expect((await documentos.fila(libroId))?.estado).toBe('pendiente');
  });
});
