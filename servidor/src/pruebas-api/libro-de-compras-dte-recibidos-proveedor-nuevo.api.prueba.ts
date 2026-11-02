import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, nitValido } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { filaGuardada, prepararBandejaGeneral, RUTA_DTE, type BandejaGeneral } from './soporte/escenario-de-bandeja.js';

const entorno = usarEntornoApi();
let bandeja: BandejaGeneral;

const propietario = (): ClienteApi => bandeja.escenario.cuenta.propietario;

async function vistaPrevia(ids: string[], cuerpo: Record<string, unknown> = {}, cliente = propietario()) {
  const respuesta = await cliente.post(`${RUTA_DTE}/vista-previa`, { ids, ...cuerpo });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return new Map<string, any>(respuesta.cuerpo.resultados.map((r: any) => [r.id, r]));
}

const tercerosConNit = (nit: string) => consultar('select 1 from terceros.terceros where nit = $1', [nit]);

beforeAll(async () => {
  bandeja = await prepararBandejaGeneral(entorno, { usuario: 'bandejapn', nitDelProveedor: nitValido('4800101') });
});

afterAll(() => vi.restoreAllMocks());

describe('vista previa con proveedor nuevo', () => {
  it('calcula el documento, cuenta lo que se haría con la propuesta y no deja nada guardado', async () => {
    const nit = nitValido('4600001');
    const id = await bandeja.sembrar({ nitEmisor: nit, nombreEmisor: 'RONALD ABEL , PENSAMIENTO MONTES' });

    const resultado = (await vistaPrevia([id])).get(id);

    expect(resultado.documento.totales.total).toBe('1120.00');
    expect(resultado.proveedorNuevo).toEqual({
      nit,
      nombreDelDte: 'RONALD ABEL , PENSAMIENTO MONTES',
      accion: 'crear',
      nombreExistente: null,
      usado: { tipoDePersona: 'individual', nombres: 'RONALD ABEL', apellidos: 'PENSAMIENTO MONTES' },
      propuesta: {
        tipoDePersona: 'individual',
        individual: { nombres: 'RONALD ABEL', apellidos: 'PENSAMIENTO MONTES' },
        juridica: { razonSocial: 'RONALD ABEL , PENSAMIENTO MONTES' },
      },
    });
    expect(await tercerosConNit(nit)).toHaveLength(0);
    expect((await filaGuardada(id)).proveedor_id).toBeNull();
  });

  it('una empresa se propone jurídica y con lo pedido para el NIT usa lo pedido', async () => {
    const nit = nitValido('4600002');
    const id = await bandeja.sembrar({ nitEmisor: nit, nombreEmisor: 'Distribuidora El Sol, S.A.' });
    const pedido = { tipoDePersona: 'individual', nombres: 'Sol', apellidos: 'Distribuidora' };

    const propuesto = (await vistaPrevia([id])).get(id).proveedorNuevo;
    const pedido_ = (await vistaPrevia([id], { proveedoresNuevos: { [nit]: pedido } })).get(id).proveedorNuevo;

    expect(propuesto.usado).toEqual({ tipoDePersona: 'juridica', razonSocial: 'Distribuidora El Sol, S.A.' });
    expect(pedido_.usado).toEqual(pedido);
    expect(pedido_.propuesta.tipoDePersona).toBe('juridica');
  });

  it('un tercero que ya es cliente recibe solo el papel, y la vista previa lo deshace', async () => {
    const nit = nitValido('4600003');
    const cliente = await propietario().post('/api/terceros', { tipo: 'juridica', razonSocial: 'Cliente, S.A.', nit });
    expect(cliente.estado, JSON.stringify(cliente.cuerpo)).toBe(201);
    await propietario().put(`/api/terceros/${cliente.cuerpo.id}/cliente`, { clase: 'directo' });
    const id = await bandeja.sembrar({ nitEmisor: nit });

    const resultado = (await vistaPrevia([id])).get(id);

    expect(resultado.proveedorNuevo).toMatchObject({ accion: 'agregar_papel', nombreExistente: 'Cliente, S.A.' });
    const ficha = await propietario().get(`/api/terceros/${cliente.cuerpo.id}`);
    expect(ficha.cuerpo.proveedor).toBeNull();
  });

  it('un proveedor inactivo responde proveedor_inactivo en su fila y las demás siguen', async () => {
    const nit = nitValido('4600004');
    const tercero = await propietario().post('/api/terceros', { tipo: 'juridica', razonSocial: 'Inactivo, S.A.', nit });
    await propietario().put(`/api/terceros/${tercero.cuerpo.id}/proveedor`, {});
    await propietario().delete(`/api/terceros/${tercero.cuerpo.id}/proveedor`);
    const [inactivo, conocido] = [await bandeja.sembrar({ nitEmisor: nit }), await bandeja.sembrar()];

    const resultados = await vistaPrevia([inactivo, conocido]);

    expect(resultados.get(inactivo).error.codigo).toBe('proveedor_inactivo');
    expect(resultados.get(conocido).documento.totales.total).toBe('1120.00');
    expect(resultados.get(conocido).proveedorNuevo).toBeUndefined();
  });

  it('sin el permiso proveedores.crear responde proveedor_nuevo_sin_permiso y no crea nada', async () => {
    const nit = nitValido('4600005');
    const id = await bandeja.sembrar({ nitEmisor: nit });
    const registrador = await crearUsuarioConPermisos(entorno, bandeja.escenario.cuenta, {
      nombres: 'Registrador',
      apellidos: 'Previa',
      permisos: ['libro-de-compras.documentos.crear'],
    });

    const resultado = (await vistaPrevia([id], {}, registrador)).get(id);

    expect(resultado.error).toMatchObject({ codigo: 'proveedor_nuevo_sin_permiso', detalles: { nit } });
    expect(await tercerosConNit(nit)).toHaveLength(0);
  });

  it('varias filas del mismo NIT dan lo mismo y ninguna deja el proveedor', async () => {
    const nit = nitValido('4600006');
    const [a, b] = [await bandeja.sembrar({ nitEmisor: nit }), await bandeja.sembrar({ nitEmisor: nit })];

    const resultados = await vistaPrevia([a, b]);

    expect(resultados.get(a).proveedorNuevo.accion).toBe('crear');
    expect(resultados.get(b).proveedorNuevo.accion).toBe('crear');
    expect(await tercerosConNit(nit)).toHaveLength(0);
  });
});

describe('de la vista previa a confirmar', () => {
  it('con un NIT nuevo la vista previa avisa, el usuario confirma lo suyo y se registra el documento', async () => {
    const nit = nitValido('4600007');
    const id = await bandeja.sembrar({ nitEmisor: nit, nombreEmisor: 'JUAN PEREZ LOPEZ' });
    const previa = (await vistaPrevia([id])).get(id);
    const { nombres, apellidos } = previa.proveedorNuevo.propuesta.individual;

    const respuesta = await propietario().post(`${RUTA_DTE}/confirmar`, {
      ids: [id],
      proveedoresNuevos: { [nit]: { tipoDePersona: 'individual', nombres, apellidos } },
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.resultados[0].documentoId).toEqual(expect.any(String));
    const [tercero] = await consultar<{ nombres: string; apellidos: string }>(
      'select nombres, apellidos from terceros.terceros where nit = $1',
      [nit],
    );
    expect(tercero).toEqual({ nombres: 'JUAN', apellidos: 'PEREZ LOPEZ' });
  });
});
