import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Operador } from '../modulos/core/compartido/aplicacion/operador.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  HOY,
  instalarDestinoFalso,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import {
  filaGuardada,
  operadorDeLaBandeja,
  RUTA_DTE,
  sembrarFila,
  sembrarLote,
  type CambiosDeLaFila,
} from './soporte/escenario-de-bandeja.js';
import { declarar, diaDe, encenderElBloqueo, mesDe } from './soporte/escenario-de-periodos.js';

const entorno = usarEntornoApi();
const SECCION = 'libro-de-compras';
const NIT_CON_DATOS = nitValido('4700001');
const NIT_SIN_DATOS = nitValido('4700002');
/** El período declarado, con el bloqueo encendido; el primer período abierto es el siguiente. */
const P = mesDe(-3);
let escenario: EscenarioDeDocumentos;
let operador: Operador;
let loteId: string;
let sinDatosId: string;

const propietario = (): ClienteApi => escenario.cuenta.propietario;
const sembrar = (cambios: CambiosDeLaFila = {}) =>
  sembrarFila(operador, loteId, {
    nitEmisor: NIT_CON_DATOS,
    conceptoId: escenario.conceptoId,
    destino: 'cuentas-por-pagar',
    fechaRecepcion: HOY,
    ...cambios,
  });

async function confirmar(ids: string[], cuerpo: Record<string, unknown> = {}) {
  const respuesta = await propietario().post(`${RUTA_DTE}/confirmar`, { ids, ...cuerpo });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return new Map<string, any>(respuesta.cuerpo.resultados.map((r: any) => [r.id, r]));
}

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'bandejaagente');
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'contribuyente_especial',
    esAgenteDeRetencionIsr: true,
  });
  operador = await operadorDeLaBandeja(escenario);
  loteId = await sembrarLote(operador);
  await registrarProveedor(escenario.cuenta, 'Con datos fiscales', {
    nit: NIT_CON_DATOS,
    secciones: { [SECCION]: { regimenIsr: 'utilidades' } },
  });
  sinDatosId = (await registrarProveedor(escenario.cuenta, 'Ferretería Los Pinos', { nit: NIT_SIN_DATOS })).proveedorId;
});

afterAll(() => vi.restoreAllMocks());

describe('empresa agente de retención del IVA: la recepción no se supone', () => {
  it('la lista la marca obligatoria y propone la fecha de emisión; sin ella confirmar falla con su campo', async () => {
    const id = await sembrar({ fechaRecepcion: null });

    const lista = await propietario().get(`${RUTA_DTE}?busqueda=${NIT_CON_DATOS}`);
    const resultado = (await confirmar([id])).get(id);

    const fila = lista.cuerpo.elementos.find((elemento: any) => elemento.id === id);
    expect(fila.propuesta).toMatchObject({ fechaRecepcion: HOY, recepcionObligatoria: true });
    expect(resultado.error).toMatchObject({
      codigo: 'falta_la_fecha_de_recepcion',
      detalles: { campo: 'fechaRecepcion' },
    });
    expect((await filaGuardada(id)).estado).toBe('pendiente');
  });

  it('«Usar la fecha de emisión» la llena en las filas elegidas y entonces se confirman', async () => {
    const [a, b] = [await sembrar({ fechaRecepcion: null }), await sembrar({ fechaRecepcion: null })];

    const completada = await propietario().patch(RUTA_DTE, { ids: [a, b], aplicarPropuestas: ['fechaRecepcion'] });
    const resultados = await confirmar([a, b]);

    expect(completada.estado, JSON.stringify(completada.cuerpo)).toBe(200);
    expect((await filaGuardada(a)).fecha_recepcion).toEqual(expect.anything());
    expect(resultados.get(a).documentoId).toEqual(expect.any(String));
    expect(resultados.get(b).documentoId).toEqual(expect.any(String));
  });
});

describe('proveedor sin datos fiscales en una empresa que retiene', () => {
  it('esa fila falla con las preguntas y las demás se registran; con la respuesta del usuario se registra', async () => {
    const [primera, mala, tercera] = [await sembrar(), await sembrar({ nitEmisor: NIT_SIN_DATOS }), await sembrar()];

    const resultados = await confirmar([primera, mala, tercera]);

    expect(resultados.get(primera).documentoId).toEqual(expect.any(String));
    expect(resultados.get(tercera).documentoId).toEqual(expect.any(String));
    expect(resultados.get(mala).error.codigo).toBe('faltan_datos_fiscales_del_proveedor');
    expect((await filaGuardada(mala)).estado).toBe('pendiente');

    const datos = { regimenIsr: 'utilidades', esAgenteDeRetencionIva: false };
    const reintento = await confirmar([mala], { datosFiscalesPorProveedor: { [sinDatosId]: datos } });

    expect(reintento.get(mala).documentoId).toEqual(expect.any(String));
    const guardados = await consultar(
      'select regimen_isr from libro_de_compras.datos_fiscales_de_proveedor where proveedor_id = $1',
      [sinDatosId],
    );
    expect(guardados).toEqual([{ regimen_isr: 'utilidades' }]);
  });

  it('un proveedor que se crea al confirmar recibe las respuestas por su NIT', async () => {
    const nit = nitValido('4700003');
    const id = await sembrar({ nitEmisor: nit });
    const datos = { regimenIsr: 'utilidades', esAgenteDeRetencionIva: false };

    const sinRespuesta = (await confirmar([id])).get(id);
    const conRespuesta = (await confirmar([id], { datosFiscalesPorProveedor: { [nit]: datos } })).get(id);

    expect(sinRespuesta.error.codigo).toBe('faltan_datos_fiscales_del_proveedor');
    expect(conRespuesta.documentoId).toEqual(expect.any(String));
  });
});

describe('período declarado y bloqueado', () => {
  let propuestoId: string;
  let pedidoId: string;

  beforeAll(async () => {
    expect((await declarar(propietario(), P)).estado).toBe(200);
    expect((await encenderElBloqueo(propietario())).estado).toBe(200);
    const emitido = { fechaEmision: diaDe(P), fechaRecepcion: diaDe(P) };
    propuestoId = await sembrar(emitido);
    pedidoId = await sembrar({ ...emitido, periodo: P });
  });

  it('la lista propone el primer período abierto y explica por qué', async () => {
    const lista = await propietario().get(`${RUTA_DTE}?busqueda=${NIT_CON_DATOS}&limite=200`);

    const fila = lista.cuerpo.elementos.find((elemento: any) => elemento.id === propuestoId);
    expect(fila.propuesta.periodo).toBe(mesDe(-2));
    expect(fila.propuesta.avisoDelPeriodo).toContain(`${P.slice(0, 7)} está declarado`);
  });

  it('sin período pedido se registra en el primer período abierto, con el aviso', async () => {
    const resultado = (await confirmar([propuestoId])).get(propuestoId);

    const [documento] = await consultar<{ periodo: string }>(
      "select to_char(periodo, 'YYYY-MM-DD') as periodo from libro_de_compras.documentos where id = $1",
      [resultado.documentoId],
    );
    expect(documento!.periodo).toBe(mesDe(-2));
    expect(resultado.avisos.join(' ')).toContain('está declarado y no admite documentos');
  });

  it('con el período declarado pedido a mano la fila falla con el período que se propone y sigue pendiente', async () => {
    const resultado = (await confirmar([pedidoId])).get(pedidoId);

    expect(resultado.error).toMatchObject({
      codigo: 'periodo_declarado',
      detalles: { periodo: P, periodoPropuesto: mesDe(-2) },
    });
    expect((await filaGuardada(pedidoId)).estado).toBe('pendiente');
  });

  it('completar con otro período abierto lo resuelve', async () => {
    const completada = await propietario().patch(RUTA_DTE, { ids: [pedidoId], cambios: { periodo: mesDe(-2) } });
    const resultado = (await confirmar([pedidoId])).get(pedidoId);

    expect(completada.estado, JSON.stringify(completada.cuerpo)).toBe(200);
    expect(resultado.documentoId).toEqual(expect.any(String));
  });
});
