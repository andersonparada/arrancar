import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  documentoDePrueba,
  instalarDestinoFalso,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { CONTRASENA_DE_PRUEBA } from './soporte/escenarios.js';
import {
  filaGuardada,
  operadorDeLaBandeja,
  RUTA_DTE,
  sembrarFila,
  sembrarLote,
  type CambiosDeLaFila,
} from './soporte/escenario-de-bandeja.js';

const entorno = usarEntornoApi();
const USUARIO = 'bandejaenlaces';
const NIT_DEL_PROVEEDOR = nitValido('4600001');
const SECCION_FISCAL = {
  tipoDePersona: 'juridica',
  regimenIva: 'general',
  regimenIsr: 'utilidades',
  agenteDeRetencionIva: 'ninguno',
  esAgenteDeRetencionIsr: false,
};
let escenario: EscenarioDeDocumentos;
let operador: Operador;
let loteId: string;
let proveedorId: string;
/** La segunda empresa de la misma cuenta, con su navegador, su concepto y el mismo proveedor (que es de la cuenta). */
let segunda: { cliente: ClienteApi; escenario: EscenarioDeDocumentos };

const propietario = (): ClienteApi => escenario.cuenta.propietario;
const sembrar = (cambios: CambiosDeLaFila = {}) =>
  sembrarFila(operador, loteId, {
    nitEmisor: NIT_DEL_PROVEEDOR,
    conceptoId: escenario.conceptoId,
    destino: 'cuentas-por-pagar',
    ...cambios,
  });

const registrarA = async (cliente: ClienteApi, base: EscenarioDeDocumentos, autorizacionFel: string) => {
  const cuerpo = documentoDePrueba(base, { proveedorId, nitEmisor: NIT_DEL_PROVEEDOR, autorizacionFel });
  const respuesta = await cliente.post(RUTA_DOCUMENTOS, cuerpo);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento.id as string;
};

const confirmar = async (id: string) => {
  const respuesta = await propietario().post(`${RUTA_DTE}/confirmar`, { ids: [id] });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo.resultados[0];
};

/** Crea la segunda empresa de la cuenta y un navegador que trabaja en ella. */
async function prepararSegundaEmpresa(): Promise<typeof segunda> {
  const nueva = await propietario().post('/api/empresas', {
    nombre: 'Segunda empresa',
    nit: nitValido('4600100'),
    secciones: { 'libro-de-compras': SECCION_FISCAL },
  });
  expect(nueva.estado, JSON.stringify(nueva.cuerpo)).toBe(201);
  const cliente = entorno.nuevoCliente();
  await cliente.iniciarSesion(USUARIO, CONTRASENA_DE_PRUEBA);
  await cliente.get('/api/sesion');
  expect((await cliente.put('/api/sesion/empresa-activa', { empresaId: nueva.cuerpo.id })).estado).toBe(200);
  const concepto = await cliente.post('/api/libro-de-compras/conceptos-de-gasto', {
    nombre: 'Insumos',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  });
  expect(concepto.estado, JSON.stringify(concepto.cuerpo)).toBe(201);
  return { cliente, escenario: { ...escenario, conceptoId: concepto.cuerpo.id } };
}

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, USUARIO);
  await configurarEmpresa(escenario.cuenta, SECCION_FISCAL);
  operador = await operadorDeLaBandeja(escenario);
  loteId = await sembrarLote(operador);
  proveedorId = (await registrarProveedor(escenario.cuenta, 'Agro del Norte, S.A.', { nit: NIT_DEL_PROVEEDOR }))
    .proveedorId;
  segunda = await prepararSegundaEmpresa();
});

afterAll(() => vi.restoreAllMocks());

describe('un DTE registrado en otra empresa de la misma cuenta', () => {
  it('queda bloqueado y visible, y se libera solo cuando esa empresa anula su documento', async () => {
    const autorizacion = crypto.randomUUID();
    const id = await sembrar({ autorizacionFel: autorizacion });
    const documentoAjeno = await registrarA(segunda.cliente, segunda.escenario, autorizacion);

    const bloqueado = await confirmar(id);

    expect(bloqueado.error).toMatchObject({
      codigo: 'dte_registrado_en_otra_empresa',
      mensaje: 'Ese DTE ya está registrado en otra empresa de su cuenta.',
    });
    expect(await filaGuardada(id)).toMatchObject({
      estado: 'bloqueado',
      motivo_de_bloqueo: 'registrado_en_otra_empresa',
    });
    const lista = await propietario().get(`${RUTA_DTE}?estado=bloqueado`);
    expect(lista.cuerpo.elementos.map((fila: any) => fila.id)).toContain(id);
    expect((await confirmar(id)).error.codigo).toBe('dte_registrado_en_otra_empresa');

    const anulado = await segunda.cliente.post(`${RUTA_DOCUMENTOS}/${documentoAjeno}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Era de la otra empresa',
    });
    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    const liberado = await confirmar(id);

    expect(liberado.documentoId).toEqual(expect.any(String));
    expect(await filaGuardada(id)).toMatchObject({ estado: 'registrado', motivo_de_bloqueo: null });
  });

  it('descartada y restaurada, vuelve a bloqueada mientras el documento de la otra empresa siga vigente', async () => {
    const autorizacion = crypto.randomUUID();
    const id = await sembrar({ autorizacionFel: autorizacion });
    await registrarA(segunda.cliente, segunda.escenario, autorizacion);
    await confirmar(id);

    const descarte = await propietario().post(`${RUTA_DTE}/descartar`, {
      ids: [id],
      motivo: 'La lleva la otra empresa',
    });
    const restauracion = await propietario().post(`${RUTA_DTE}/${id}/restaurar`);

    expect(descarte.estado, JSON.stringify(descarte.cuerpo)).toBe(200);
    expect(descarte.cuerpo.elementos[0]).toMatchObject({ estado: 'descartado', motivoDeBloqueo: null });
    expect(restauracion.cuerpo).toMatchObject({ estado: 'bloqueado', motivoDeBloqueo: 'registrado_en_otra_empresa' });
  });
});

describe('un DTE registrado en otra cuenta', () => {
  it('no se avisa nada: la fila sigue pendiente y al confirmar sale el mensaje genérico', async () => {
    const otra = await prepararEscenario(entorno, 'bandejaotracuenta');
    await configurarEmpresa(otra.cuenta, SECCION_FISCAL);
    const autorizacion = crypto.randomUUID();
    const proveedorAjeno = await registrarProveedor(otra.cuenta, 'Otro proveedor');
    const cuerpo = documentoDePrueba(otra, { proveedorId: proveedorAjeno.proveedorId, autorizacionFel: autorizacion });
    expect((await otra.cuenta.propietario.post(RUTA_DOCUMENTOS, cuerpo)).estado).toBe(201);
    const id = await sembrar({ autorizacionFel: autorizacion });

    const resultado = await confirmar(id);

    expect(resultado.error).toEqual({
      codigo: 'duplicado',
      mensaje: 'Ese documento ya está registrado.',
    });
    expect(await filaGuardada(id)).toMatchObject({ estado: 'pendiente', motivo_de_bloqueo: null });
    const lista = await propietario().get(`${RUTA_DTE}?estado=pendiente&limite=200`);
    const fila = lista.cuerpo.elementos.find((elemento: any) => elemento.id === id);
    expect(fila).toMatchObject({ estado: 'pendiente', motivoDeBloqueo: null });
  });
});

describe('registrar a mano un documento con FEL', () => {
  it('pasa a registrado la fila con esa autorización, y anular el documento la devuelve a pendiente', async () => {
    const autorizacion = crypto.randomUUID();
    const id = await sembrar({ autorizacionFel: autorizacion });

    const documentoId = await registrarA(propietario(), escenario, autorizacion);

    expect(await filaGuardada(id)).toMatchObject({ estado: 'registrado', documento_id: documentoId });

    const anulado = await propietario().post(`${RUTA_DOCUMENTOS}/${documentoId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Se registró por error',
    });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(await filaGuardada(id)).toMatchObject({ estado: 'pendiente', documento_id: null });
  });

  it('eliminar el documento también la devuelve a pendiente, y una descartada se registra si el usuario lo decide', async () => {
    const autorizacion = crypto.randomUUID();
    const id = await sembrar({ autorizacionFel: autorizacion });
    await propietario().post(`${RUTA_DTE}/descartar`, { ids: [id], motivo: 'No la queríamos' });

    const documentoId = await registrarA(propietario(), escenario, autorizacion);
    expect(await filaGuardada(id)).toMatchObject({
      estado: 'registrado',
      documento_id: documentoId,
      motivo_de_descarte: null,
    });

    const eliminado = await propietario().delete(`${RUTA_DOCUMENTOS}/${documentoId}`);

    expect(eliminado.estado, JSON.stringify(eliminado.cuerpo)).toBe(200);
    expect(await filaGuardada(id)).toMatchObject({ estado: 'pendiente', documento_id: null });
  });

  it('un documento sin fila en la bandeja se registra como siempre', async () => {
    const documentoId = await registrarA(propietario(), escenario, crypto.randomUUID());

    expect(documentoId).toEqual(expect.any(String));
  });

  it('registrar por la bandeja y anular ese documento devuelve la fila a pendiente, lista para confirmarse otra vez', async () => {
    const id = await sembrar();
    const documentoId = (await confirmar(id)).documentoId;

    await propietario().post(`${RUTA_DOCUMENTOS}/${documentoId}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Se confirmó la fila equivocada',
    });

    expect(await filaGuardada(id)).toMatchObject({ estado: 'pendiente', documento_id: null });
    expect((await confirmar(id)).documentoId).not.toBe(documentoId);
  });
});
