import { afterAll, beforeAll, describe, expect, it } from 'vitest';
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
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const RUTA = '/api/cuentas-por-pagar/documentos';
const entorno = usarEntornoApi();
const EMISION = haceDias(3);
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;
let completa: ClienteApi;
let autoriza: ClienteApi;
const autorizados: Array<{ documentoId: string; autorizacionPropia: boolean }> = [];
const desautorizados: string[] = [];

const propietario = () => escenario.cuenta.propietario;
const idAqui = async (documentoDeCompraId: string) => (await documentos.fila(documentoDeCompraId))!.id;
const procesadoEnLibro = async (id: string) =>
  (
    await consultar<{ procesado: boolean }>(
      'select procesado_en_destino_en is not null as procesado from libro_de_compras.documentos where id = $1',
      [id],
    )
  )[0]?.procesado;
const auditoriaDe = (accion: string, registroId: string) =>
  consultar<{ motivo: string | null; anterior: Record<string, unknown> }>(
    'select motivo, anterior from core.auditoria where recurso = $1 and accion = $2 and registro_id = $3',
    ['cuentas-por-pagar.documentos', accion, registroId],
  );
const completar = (cliente: ClienteApi, ...documentosPorCompletar: Array<{ id: string; vencimiento?: string }>) =>
  cliente.post(`${RUTA}/registrar`, { documentos: documentosPorCompletar });
const autorizar = (cliente: ClienteApi, ...ids: string[]) => cliente.post(`${RUTA}/autorizar`, { ids });
/** Un documento registrado en Libro de compras por el propietario y completado por `completa`. */
const completado = async (cambios: Record<string, unknown> = {}) => {
  const libroId = await documentos.registrar(cambios);
  const id = await idAqui(libroId);
  expect((await completar(completa, { id })).estado).toBe(200);
  return { libroId, id };
};

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpacciones', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, EMISION);
  completa = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Completa',
    apellidos: 'Y autoriza',
    permisos: [
      'cuentas-por-pagar.documentos.ver',
      'cuentas-por-pagar.documentos.registrar',
      'cuentas-por-pagar.documentos.autorizar',
    ],
  });
  autoriza = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo',
    apellidos: 'Autoriza',
    permisos: ['cuentas-por-pagar.documentos.ver', 'cuentas-por-pagar.documentos.autorizar'],
  });
  busEventos.suscribir('cuentas-por-pagar.documento_autorizado', async (datos) => {
    autorizados.push({ documentoId: datos.documentoDeCompraId, autorizacionPropia: datos.autorizacionPropia });
  });
  busEventos.suscribir('cuentas-por-pagar.documento_desautorizado', async (datos) => {
    desautorizados.push(datos.documentoDeCompraId);
  });
});

afterAll(() => {
  autorizados.length = 0;
});

describe('completar en la bandeja', () => {
  it('pasa a completado con quién lo completó, deja el vencimiento propuesto o el confirmado', async () => {
    const propuesto = await idAqui(await documentos.registrar());
    const confirmado = await idAqui(await documentos.registrar());

    const respuesta = await completar(completa, { id: propuesto }, { id: confirmado, vencimiento: haceDias(-45) });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toHaveLength(2);
    expect(respuesta.cuerpo[0]).toMatchObject({ estado: 'registrado', puedeAutorizar: true, esPropio: true });
    expect(respuesta.cuerpo[1]).toMatchObject({ vencimiento: haceDias(-45) });
    const [fila] = await consultar<{ registrado_por: string | null }>(
      'select registrado_por from cuentas_por_pagar.documentos where id = $1',
      [propuesto],
    );
    expect(fila?.registrado_por).not.toBeNull();
  });

  it('es todo o nada: si uno falla, ninguno se completa', async () => {
    const bueno = await idAqui(await documentos.registrar());
    const malo = await idAqui(await documentos.registrar());

    const respuesta = await completar(completa, { id: bueno }, { id: malo, vencimiento: haceDias(30) });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('vencimiento_invalido');
    const estados = await consultar<{ estado: string }>(
      'select estado from cuentas_por_pagar.documentos where id = any($1)',
      [[bueno, malo]],
    );
    expect(estados.map((e) => e.estado)).toEqual(['pendiente', 'pendiente']);
  });

  it('no completa dos veces, ni lo que no existe, ni más de cien, ni sin permiso', async () => {
    const { id } = await completado();
    const inexistente = await completar(completa, { id: crypto.randomUUID() });
    const demasiados = await completar(completa, ...Array.from({ length: 101 }, () => ({ id: crypto.randomUUID() })));

    expect((await completar(completa, { id })).cuerpo.error.codigo).toBe('documento_no_pendiente');
    expect(inexistente.estado).toBe(404);
    expect(demasiados.estado).toBe(400);
    expect((await completar(autoriza, { id })).estado).toBe(403);
  });

  it('una nota de crédito se completa sin vencimiento', async () => {
    const facturaId = await documentos.registrar();
    const notaId = await documentos.registrarNota('NCRE', facturaId, { total: '336.00' });

    const respuesta = await completar(completa, { id: await idAqui(notaId) });

    expect(respuesta.cuerpo[0]).toMatchObject({ estado: 'registrado', clase: 'abono', vencimiento: null });
  });
});

describe('cambiar el vencimiento', () => {
  it('cambia el de un cargo completado, sin auditar, y no el de uno pendiente', async () => {
    const pendiente = await idAqui(await documentos.registrar());
    const { id } = await completado();

    const rechazado = await propietario().patch(`${RUTA}/${pendiente}`, { vencimiento: haceDias(-20) });
    const cambiado = await completa.patch(`${RUTA}/${id}`, { vencimiento: haceDias(-20) });

    expect(rechazado.cuerpo.error.codigo).toBe('vencimiento_no_editable');
    expect(cambiado.estado).toBe(200);
    expect(cambiado.cuerpo.vencimiento).toBe(haceDias(-20));
    expect(await auditoriaDe('corregir', id)).toEqual([]);
    expect((await completa.patch(`${RUTA}/${id}`, { vencimiento: haceDias(10) })).cuerpo.error.codigo).toBe(
      'vencimiento_invalido',
    );
  });
});

describe('autorizar', () => {
  it('otra persona autoriza: queda aprobado para pago, procesado en Libro de compras y se publica el evento', async () => {
    const { id, libroId } = await completado();

    const respuesta = await autorizar(autoriza, id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo[0]).toMatchObject({
      estado: 'autorizado',
      autorizacionPropia: false,
      puedeDesautorizar: true,
    });
    expect(await procesadoEnLibro(libroId)).toBe(true);
    expect(await auditoriaDe('autorizar', id)).toEqual([]);
    expect(autorizados).toContainEqual({ documentoId: libroId, autorizacionPropia: false });
  });

  it('Libro de compras ya no lo elimina, solo lo anula', async () => {
    const { id, libroId } = await completado();
    await autorizar(autoriza, id);

    const respuesta = await propietario().delete(`${RUTA_DOCUMENTOS}/${libroId}`);

    expect(respuesta.estado).toBe(422);
    expect((await documentos.fila(libroId))?.estado).toBe('autorizado');
  });

  it('quien lo completó no lo autoriza sin el permiso de lo propio y el mensaje nombra el documento', async () => {
    const { id, libroId } = await completado({ serie: 'Z', numero: '7001' });

    const respuesta = await autorizar(completa, id);

    expect(respuesta.estado).toBe(403);
    expect(respuesta.cuerpo.error.codigo).toBe('autorizacion_de_lo_propio');
    expect(respuesta.cuerpo.error.mensaje).toContain('Z-7001');
    expect((await documentos.fila(libroId))?.estado).toBe('registrado');
    expect(await procesadoEnLibro(libroId)).toBe(false);
  });

  it('con el permiso de lo propio (el propietario) queda marcado y auditado con la ficha anterior', async () => {
    const { id, libroId } = await completado();
    // lo ingresó el propietario en Libro de compras, y él lo autoriza
    const respuesta = await autorizar(propietario(), id);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo[0]).toMatchObject({ estado: 'autorizado', autorizacionPropia: true });
    const [auditado] = await auditoriaDe('autorizar', id);
    expect(auditado).toMatchObject({
      motivo: 'Autorizó un documento que ingresó o completó.',
      anterior: { id, estado: 'registrado', autorizacionPropia: false },
    });
    expect(autorizados).toContainEqual({ documentoId: libroId, autorizacionPropia: true });
  });

  it('es en lote y todo o nada', async () => {
    const primero = await completado();
    const segundo = await completado();
    const sinCompletar = await idAqui(await documentos.registrar());

    const fallido = await autorizar(autoriza, primero.id, sinCompletar);
    const bueno = await autorizar(autoriza, primero.id, segundo.id);

    expect(fallido.cuerpo.error.codigo).toBe('documento_no_registrado');
    expect(bueno.cuerpo).toHaveLength(2);
    expect((await documentos.fila(primero.libroId))?.estado).toBe('autorizado');
    expect((await documentos.fila(segundo.libroId))?.estado).toBe('autorizado');
  });

  it('una falla en el lote deshace también lo ya autorizado y lo procesado en Libro de compras', async () => {
    const listo = await completado();
    const sinCompletar = await idAqui(await documentos.registrar());
    const ids = [listo.id, sinCompletar].sort();

    const respuesta = await autorizar(autoriza, ...ids);

    expect(respuesta.estado).toBe(422);
    expect((await documentos.fila(listo.libroId))?.estado).toBe('registrado');
    expect(await procesadoEnLibro(listo.libroId)).toBe(false);
  });

  it('pide su permiso y rechaza lo que no existe', async () => {
    const { id } = await completado();

    expect((await autorizar(completa, crypto.randomUUID())).estado).toBe(404);
    const sinPermiso = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
      nombres: 'Solo mira',
      apellidos: 'Mira',
      permisos: ['cuentas-por-pagar.documentos.ver'],
    });
    expect((await autorizar(sinPermiso, id)).estado).toBe(403);
  });
});

describe('desautorizar', () => {
  it('vuelve a completado con su motivo, devuelve el documento a pendiente en Libro de compras, lo audita y publica', async () => {
    const { id, libroId } = await completado();
    await autorizar(autoriza, id);

    const respuesta = await autoriza.post(`${RUTA}/${id}/desautorizar`, { motivo: 'Faltaba la contraseña' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ estado: 'registrado', autorizacionPropia: false, puedeAutorizar: true });
    expect(await procesadoEnLibro(libroId)).toBe(false);
    const [devuelto] = await auditoriaDe('devolver', id);
    expect(devuelto).toMatchObject({ motivo: 'Faltaba la contraseña', anterior: { estado: 'autorizado' } });
    expect(desautorizados).toContain(libroId);
  });

  it('exige el motivo, un documento autorizado y el permiso de autorizar', async () => {
    const { id } = await completado();
    await autorizar(autoriza, id);

    const sinMotivo = await autoriza.post(`${RUTA}/${id}/desautorizar`, { motivo: '  ' });
    const sinPermiso = await propietario().post(`${RUTA}/${await idAqui(await documentos.registrar())}/desautorizar`, {
      motivo: 'x',
    });
    const quienNoPuede = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
      nombres: 'Sin',
      apellidos: 'Autorizar',
      permisos: ['cuentas-por-pagar.documentos.registrar'],
    });

    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_invalido');
    expect(sinPermiso.cuerpo.error.codigo).toBe('documento_no_autorizado');
    expect((await quienNoPuede.post(`${RUTA}/${id}/desautorizar`, { motivo: 'x' })).estado).toBe(403);
  });
});
