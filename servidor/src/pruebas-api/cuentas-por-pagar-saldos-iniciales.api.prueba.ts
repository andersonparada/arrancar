/**
 * Cuentas por pagar con dos orígenes (U8-2): un saldo inicial, sembrado en la prueba (la carga llega en U8-3), aparece
 * en la lista, la ficha y el saldo del proveedor con su neto; se autoriza y desautoriza sin tocar Libro de compras; no se
 * anula ni se elimina por Documentos, y su documento no se puede registrar de nuevo en el libro.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/cuentas-por-pagar.contratos.js';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import {
  DocumentosPorPagarDePrueba,
  MODULOS_DE_CUENTAS_POR_PAGAR,
  proveedorConCredito,
} from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  documentoDePrueba,
  HOY,
  prepararEscenario,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';

const RUTA = '/api/cuentas-por-pagar';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;
const eventos: Array<{ nombre: string; origen: string; documentoDeCompraId: string | null }> = [];

const propietario = () => escenario.cuenta.propietario;
const ver = async (ruta: string) => {
  const respuesta = await propietario().get(`${RUTA}${ruta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpsaldosini', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, HOY);
  for (const nombre of ['documento_autorizado', 'documento_desautorizado'] as const) {
    busEventos.suscribir(`cuentas-por-pagar.${nombre}`, async (datos) => {
      eventos.push({ nombre, origen: datos.origen, documentoDeCompraId: datos.documentoDeCompraId });
    });
  }
});

afterAll(() => {
  eventos.length = 0;
});

describe('un saldo inicial en las consultas', () => {
  it('sale en la lista y la ficha con su neto, sin restar las retenciones por practicar, y el filtro de origen lo separa', async () => {
    const id = await documentos.sembrarSaldoInicial({ serie: 'S', numero: '77001' });
    await documentos.registrar({ serie: 'L', numero: '5001' });

    const soloSaldos = await ver('/documentos?origen=saldo_inicial');
    const soloLibro = await ver('/documentos?origen=libro_de_compras');
    const ficha = await ver(`/documentos/${id}`);

    expect(soloSaldos.elementos.map((e: { id: string }) => e.id)).toEqual([id]);
    expect(soloLibro.elementos.length).toBeGreaterThan(0);
    expect(soloLibro.elementos.every((e: { origen: string }) => e.origen === 'libro_de_compras')).toBe(true);
    expect(ficha).toMatchObject({
      origen: 'saldo_inicial',
      documentoId: null,
      serie: 'S',
      numero: '77001',
      fechaRecepcion: null,
      periodo: null,
      total: '1120.00',
      retenciones: '120.00',
      saldoAlInicio: '700.00',
      retencionesPorPracticar: '50.00',
      referencia: 'CXP-0045',
      anterioresAlInicio: '300.00',
      neto: '700.00',
      saldo: '700.00',
      puedeAutorizar: true,
      puedeCambiarVencimiento: true,
      puedeAnular: false,
      puedeEliminar: false,
      anulacion: null,
      notas: [],
      aplicaciones: [],
    });
  });

  it('un documento del libro trae los campos del saldo inicial en nulo', async () => {
    const libroId = await documentos.registrar({ serie: 'L', numero: '5002' });
    const { id } = (await documentos.fila(libroId))!;

    expect(await ver(`/documentos/${id}`)).toMatchObject({
      origen: 'libro_de_compras',
      documentoId: libroId,
      saldoAlInicio: null,
      retencionesPorPracticar: null,
      referencia: null,
      anterioresAlInicio: null,
    });
  });

  it('el saldo del proveedor suma su saldo al inicio, sin las retenciones por practicar', async () => {
    const { proveedorId, nitEmisor } = await proveedorConCredito(escenario, {
      nombre: 'Con saldo inicial S.A.',
      nit: '5300021',
      diasDeCredito: 0,
    });
    await documentos.sembrarSaldoInicial({ proveedorId, fechaEmision: '2025-12-20', vencimiento: '2026-01-10' });
    await documentos.registrar({ proveedorId, nitEmisor });

    expect(await ver(`/proveedores/${proveedorId}/saldo`)).toMatchObject({
      porPagar: '1820.00',
      vencido: '700.00',
      cargosConSaldo: 2,
    });
  });

  it('una nota de crédito cargada como saldo inicial deja su saldo al inicio a favor', async () => {
    const { proveedorId } = await proveedorConCredito(escenario, {
      nombre: 'Nota inicial S.A.',
      nit: '5300022',
      diasDeCredito: 0,
    });
    const id = await documentos.sembrarSaldoInicial({
      proveedorId,
      tipo: 'nota_de_credito',
      retenciones: '0',
      retencionesPorPracticar: '0',
      saldoAlInicio: '400',
      total: '500',
      vencimiento: null,
    });

    const saldo = await ver(`/proveedores/${proveedorId}/saldo`);

    expect(saldo).toMatchObject({ porPagar: '0.00', saldosDeudores: '400.00' });
    expect(saldo.notasConSaldoLibre).toEqual([
      expect.objectContaining({ id, documentoId: null, saldoLibre: '400.00' }),
    ]);
    expect(await ver(`/documentos/${id}`)).toMatchObject({
      clase: 'abono',
      anterioresAlInicio: '100.00',
      saldo: '400.00',
    });
  });
});

describe('un saldo inicial en las acciones', () => {
  it('se autoriza y se desautoriza sin tocar Libro de compras, y los eventos llevan el origen', async () => {
    const id = await documentos.sembrarSaldoInicial({ numero: '77010' });
    eventos.length = 0;

    const autorizado = await propietario().post(`${RUTA}/documentos/autorizar`, { ids: [id] });
    const desautorizado = await propietario().post(`${RUTA}/documentos/${id}/desautorizar`, {
      motivo: 'Faltaba revisarlo',
    });

    expect(autorizado.estado, JSON.stringify(autorizado.cuerpo)).toBe(200);
    expect(autorizado.cuerpo[0]).toMatchObject({ estado: 'autorizado', puedeDesautorizar: true });
    expect(desautorizado.estado, JSON.stringify(desautorizado.cuerpo)).toBe(200);
    expect(eventos).toEqual([
      { nombre: 'documento_autorizado', origen: 'saldo_inicial', documentoDeCompraId: null },
      { nombre: 'documento_desautorizado', origen: 'saldo_inicial', documentoDeCompraId: null },
    ]);
  });

  it('no se anula ni se elimina por Documentos y queda igual', async () => {
    const id = await documentos.sembrarSaldoInicial({ numero: '77011' });

    const anulado = await propietario().post(`${RUTA}/documentos/${id}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Prueba',
    });
    const eliminado = await propietario().delete(`${RUTA}/documentos/${id}`);

    for (const respuesta of [anulado, eliminado]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('es_un_saldo_inicial');
    }
    const [fila] = await consultar<{ estado: string }>(
      'select estado from cuentas_por_pagar.documentos where id = $1',
      [id],
    );
    expect(fila?.estado).toBe('registrado');
    expect(await consultar('select 1 from core.auditoria where registro_id = $1', [id])).toHaveLength(0);
  });
});

describe('registrar en Libro de compras lo que ya es un saldo inicial', () => {
  it('falla por el único y no deja nada en el libro', async () => {
    await documentos.sembrarSaldoInicial({ serie: 'Z', numero: '88001' });

    const respuesta = await propietario().post(
      RUTA_DOCUMENTOS,
      documentoDePrueba(escenario, { serie: 'Z', numero: '88001', fechaEmision: HOY }),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBeGreaterThanOrEqual(400);
    const enElLibro = await consultar(
      `select 1 from libro_de_compras.documentos where serie = 'Z' and numero = '88001'`,
    );
    expect(enElLibro).toHaveLength(0);
  });
});
