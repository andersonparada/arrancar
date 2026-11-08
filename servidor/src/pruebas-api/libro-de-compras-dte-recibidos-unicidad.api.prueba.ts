import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  instalarDestinoFalso,
  NIT_DE_LA_EMPRESA,
  prepararEscenario,
  registrarProveedor,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { CONTRASENA_DE_PRUEBA } from './soporte/escenarios.js';
import {
  filaGuardada,
  operadorDeLaBandeja,
  RUTA_DTE,
  sembrarFila,
  sembrarLote,
} from './soporte/escenario-de-bandeja.js';

const entorno = usarEntornoApi();
const USUARIO_DE_LA_PRIMERA = 'unicidadprimera';
const NIT_DEL_EMISOR = '576937K';
const SECCION_FISCAL = {
  tipoDePersona: 'juridica',
  regimenIva: 'general',
  regimenIsr: 'utilidades',
  agenteDeRetencionIva: 'ninguno',
  esAgenteDeRetencionIsr: false,
};
/** Una empresa con su navegador y su concepto de gasto. */
interface Sitio {
  escenario: EscenarioDeDocumentos;
  cliente: ClienteApi;
}
let primera: Sitio;
let segunda: Sitio;
let hermana: Sitio;

/** Siembra la fila del DTE en la empresa del sitio y la confirma desde su navegador. */
async function sembrarYConfirmar(sitio: Sitio, autorizacionFel: string) {
  const operador = await operadorDeLaBandeja(sitio.escenario);
  const loteId = await sembrarLote(operador);
  const id = await sembrarFila(operador, loteId, {
    nitEmisor: NIT_DEL_EMISOR,
    serie: 'U17',
    numero: autorizacionFel.slice(0, 8).toUpperCase(),
    autorizacionFel,
    conceptoId: sitio.escenario.conceptoId,
    destino: 'cuentas-por-pagar',
  });
  const respuesta = await sitio.cliente.post(`${RUTA_DTE}/confirmar`, { ids: [id] });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return { id, resultado: respuesta.cuerpo.resultados[0] };
}

/** Otra empresa de la primera cuenta, con el mismo NIT, y un navegador que trabaja en ella. */
async function prepararHermana(): Promise<Sitio> {
  const nueva = await primera.cliente.post('/api/empresas', {
    nombre: 'Hermana con el mismo NIT',
    nit: NIT_DE_LA_EMPRESA,
    secciones: { 'libro-de-compras': SECCION_FISCAL },
  });
  expect(nueva.estado, JSON.stringify(nueva.cuerpo)).toBe(201);
  const cliente = entorno.nuevoCliente();
  await cliente.iniciarSesion(USUARIO_DE_LA_PRIMERA, CONTRASENA_DE_PRUEBA);
  await cliente.get('/api/sesion');
  await cliente.put('/api/sesion/empresa-activa', { empresaId: nueva.cuerpo.id });
  const concepto = await cliente.post('/api/libro-de-compras/conceptos-de-gasto', {
    nombre: 'Insumos',
    tipoPorOmision: 'bien',
    esProductoAgropecuario: false,
    esActivoFijo: false,
    activo: true,
  });
  expect(concepto.estado, JSON.stringify(concepto.cuerpo)).toBe(201);
  const cuenta = { ...primera.escenario.cuenta, empresaId: nueva.cuerpo.id as string };
  return { cliente, escenario: { ...primera.escenario, cuenta, conceptoId: concepto.cuerpo.id } };
}

beforeAll(async () => {
  instalarDestinoFalso();
  const escenarioPrimera = await prepararEscenario(entorno, USUARIO_DE_LA_PRIMERA);
  const escenarioSegunda = await prepararEscenario(entorno, 'unicidadsegunda');
  await configurarEmpresa(escenarioPrimera.cuenta, SECCION_FISCAL);
  await configurarEmpresa(escenarioSegunda.cuenta, SECCION_FISCAL);
  primera = { escenario: escenarioPrimera, cliente: escenarioPrimera.cuenta.propietario };
  segunda = { escenario: escenarioSegunda, cliente: escenarioSegunda.cuenta.propietario };
  await registrarProveedor(escenarioPrimera.cuenta, 'Agro del Norte, S.A.', { nit: NIT_DEL_EMISOR });
  await registrarProveedor(escenarioSegunda.cuenta, 'Agro del Norte, S.A.', { nit: NIT_DEL_EMISOR });
  hermana = await prepararHermana();
});

afterAll(() => vi.restoreAllMocks());

describe('el mismo DTE en la bandeja', () => {
  it('en dos cuentas con empresas del mismo NIT se confirma en las dos', async () => {
    const autorizacion = crypto.randomUUID();

    const deLaPrimera = await sembrarYConfirmar(primera, autorizacion);
    const deLaSegunda = await sembrarYConfirmar(segunda, autorizacion);

    expect(deLaPrimera.resultado.documentoId).toEqual(expect.any(String));
    expect(deLaSegunda.resultado.documentoId).toEqual(expect.any(String));
    expect(await filaGuardada(deLaSegunda.id)).toMatchObject({ estado: 'registrado', motivo_de_bloqueo: null });
  });

  it('en dos empresas de la misma cuenta, la segunda fila queda bloqueada', async () => {
    const autorizacion = crypto.randomUUID();
    const registrada = await sembrarYConfirmar(primera, autorizacion);

    const repetida = await sembrarYConfirmar(hermana, autorizacion);

    expect(registrada.resultado.documentoId).toEqual(expect.any(String));
    expect(repetida.resultado.error).toMatchObject({ codigo: 'dte_registrado_en_otra_empresa' });
    expect(await filaGuardada(repetida.id)).toMatchObject({
      estado: 'bloqueado',
      motivo_de_bloqueo: 'registrado_en_otra_empresa',
    });
  });
});
