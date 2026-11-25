/**
 * Documentos de venta (LV-2): la lista con sus filtros, la ficha, los permisos por acción, el aislamiento entre cuentas
 * y el módulo apagado.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { primerDiaDelMes } from './soporte/escenario-de-documentos.js';
import {
  documentoDeVentaDePrueba,
  prepararEscenarioDeVentas,
  RUTA_DOCUMENTOS_DE_VENTA as RUTA,
  type EscenarioDeVentas,
} from './soporte/escenario-de-ventas.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeVentas;
let ajeno: EscenarioDeVentas;
let soloVer: ClienteApi;
let creador: ClienteApi;

const propietario = () => escenario.cuenta.propietario;
const registrar = async (cambios: Record<string, unknown> = {}) => {
  const respuesta = await propietario().post(RUTA, documentoDeVentaDePrueba(escenario, cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento as { id: string };
};

beforeAll(async () => {
  escenario = await prepararEscenarioDeVentas(entorno, 'ventasconsultas');
  ajeno = await prepararEscenarioDeVentas(entorno, 'ventasconsultasajeno');
  const con = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, escenario.cuenta, { nombres, apellidos: 'Ventas', permisos });
  soloVer = await con('Solo ver', ['libro-de-ventas.documentos.ver']);
  creador = await con('Creador', ['libro-de-ventas.documentos.crear']);
});

afterAll(() => vi.restoreAllMocks());

describe('consultar', () => {
  it('la lista filtra por mes, cliente, tipo, estado, destino y texto, y pagina', async () => {
    const pasado = primerDiaDelMes(-3);
    await registrar({ fechaEmision: `${pasado.slice(0, 8)}10`, serie: 'LISTA', numero: '1' });
    const anulada = await registrar({ fechaEmision: `${pasado.slice(0, 8)}11`, serie: 'LISTA', numero: '2' });
    await propietario().post(`${RUTA}/${anulada.id}/anular`, { causa: 'error_de_captura', motivo: 'Prueba' });
    await registrar({ fechaEmision: `${pasado.slice(0, 8)}12`, serie: 'LISTA', numero: '3', clienteId: null });

    const vigentes = await propietario().get(`${RUTA}?periodo=${pasado}`);
    const todos = await propietario().get(`${RUTA}?periodo=${pasado}&estado=todos`);
    const soloAnulados = await propietario().get(`${RUTA}?periodo=${pasado}&estado=anulado`);
    const porCliente = await propietario().get(`${RUTA}?periodo=${pasado}&clienteId=${escenario.clienteId}`);
    const porTexto = await propietario().get(`${RUTA}?texto=lista&estado=todos`);
    const porSerieYNumero = await propietario().get(`${RUTA}?texto=${encodeURIComponent('LISTA-2')}&estado=todos`);
    const sinDestino = await propietario().get(`${RUTA}?periodo=${pasado}&destino=ninguno`);
    const porTipo = await propietario().get(`${RUTA}?periodo=${pasado}&tipo=nota_de_credito`);
    const pagina = await propietario().get(`${RUTA}?estado=todos&limite=1&pagina=2`);

    expect(vigentes.cuerpo.total).toBe(2);
    expect(todos.cuerpo.total).toBe(3);
    expect(soloAnulados.cuerpo.elementos.map((fila: { numero: string }) => fila.numero)).toEqual(['2']);
    expect(porCliente.cuerpo.total).toBe(1);
    expect(porTexto.cuerpo.total).toBe(3);
    expect(porSerieYNumero.cuerpo.elementos.map((fila: { numero: string }) => fila.numero)).toEqual(['2']);
    expect(sinDestino.cuerpo.total).toBe(2);
    expect(porTipo.cuerpo.total).toBe(0);
    expect(pagina.cuerpo).toMatchObject({ pagina: 2, limite: 1 });
    expect(pagina.cuerpo.elementos).toHaveLength(1);
  });

  it('sinCliente trae solo los de consumidor final y se combina con el texto', async () => {
    const pasado = primerDiaDelMes(-4);
    await registrar({ fechaEmision: `${pasado.slice(0, 8)}10`, serie: 'CFINAL', numero: '1' });
    await registrar({ fechaEmision: `${pasado.slice(0, 8)}11`, serie: 'CFINAL', numero: '2', clienteId: null });

    const sinCliente = await propietario().get(`${RUTA}?texto=cfinal&sinCliente=true`);
    const todos = await propietario().get(`${RUTA}?texto=cfinal&sinCliente=false`);

    expect(sinCliente.cuerpo.elementos.map((fila: { numero: string }) => fila.numero)).toEqual(['2']);
    expect(todos.cuerpo.total).toBe(2);
  });

  it('la ficha trae las líneas y las notas; una cuenta ajena no la ve', async () => {
    const factura = await registrar();
    const nota = await registrar({ tipo: 'nota_de_credito', documentoAfectadoId: factura.id });

    const ficha = await propietario().get(`${RUTA}/${factura.id}`);

    expect(ficha.cuerpo.notas).toEqual([
      expect.objectContaining({ id: nota.id, tipo: 'nota_de_credito', estado: 'vigente' }),
    ]);
    expect(ficha.cuerpo).toMatchObject({ puedeAnular: false, puedeEliminar: false });
    expect((await ajeno.cuenta.propietario.get(`${RUTA}/${factura.id}`)).estado).toBe(404);
    expect(
      (await ajeno.cuenta.propietario.post(`${RUTA}/${factura.id}/anular`, { causa: 'error_de_captura', motivo: 'x' }))
        .estado,
    ).toBe(404);
    expect((await ajeno.cuenta.propietario.delete(`${RUTA}/${factura.id}`)).estado).toBe(404);
  });
});

describe('permisos y módulo apagado', () => {
  it('cada acción exige su permiso y sin sesión es 401', async () => {
    const original = await registrar();
    const cuerpo = documentoDeVentaDePrueba(escenario);

    expect((await soloVer.get(RUTA)).estado).toBe(200);
    expect((await soloVer.post(RUTA, cuerpo)).estado).toBe(403);
    expect(
      (await soloVer.post(`${RUTA}/${original.id}/anular`, { causa: 'error_de_captura', motivo: 'x' })).estado,
    ).toBe(403);
    expect((await soloVer.delete(`${RUTA}/${original.id}`)).estado).toBe(403);
    expect((await creador.get(RUTA)).estado).toBe(403);
    expect((await creador.post(RUTA, cuerpo)).estado).toBe(201);
    expect((await entorno.nuevoCliente().get(RUTA)).estado).toBe(401);
  });

  it('sin el módulo activo las rutas se cierran', async () => {
    const sinVentas = await darDeAltaCuenta(entorno, {
      nombre: 'Sin ventas',
      usuario: 'propietariosinventasdocs',
      modulos: ['terceros', 'libro-de-compras'],
    });

    const respuesta = await sinVentas.propietario.get(RUTA);

    expect([403, 404]).toContain(respuesta.estado);
  });
});
