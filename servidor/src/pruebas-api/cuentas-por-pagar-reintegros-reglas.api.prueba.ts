/**
 * Lo que impide registrar un reintegro (CP4-7): el saldo libre de la nota, el proveedor, la contraseña, el estado de la
 * nota, la fecha y los permisos; y lo que el reintegro vigente impide a su nota (anularla o eliminarla).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import {
  cuantosMovimientosEn,
  cuantosReintegros,
  depositoDe,
  efectivoDe,
  notaConSaldoLibre,
  registrarReintegro,
  RUTA_DE_REINTEGROS,
  type NotaDePrueba,
} from './soporte/cuentas-por-pagar-reintegros.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let sinPermisos: ClienteApi;
let soloVer: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpreintreglas');
  const usuario = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, { nombres, apellidos: 'Reintegros', permisos });
  sinPermisos = await usuario('Sin acceso', ['cuentas-por-pagar.pagos.ver']);
  soloVer = await usuario('Ve reintegros', ['cuentas-por-pagar.documentos.ver']);
});

async function unaNota(opciones: Parameters<typeof notaConSaldoLibre>[2] = {}): Promise<NotaDePrueba> {
  return notaConSaldoLibre(e, await e.mundo.unProveedor(), opciones);
}

/** El cuerpo de dar de baja una nota desde Cuentas por pagar. */
const CAUSA_DE_BAJA = { causa: 'error_de_captura', motivo: 'Error' };
const ficha = async (id: string) => (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${id}`)).cuerpo;
const monto = (nota: NotaDePrueba, valor = '100.00') => ({ notaId: nota.notaPropia, monto: valor });
const intentar = (cuerpo: Record<string, unknown>, cliente: ClienteApi = e.propietario()) =>
  cliente.post(RUTA_DE_REINTEGROS, cuerpo);

/** Comprueba que el rechazo no dejó rastro: ni reintegros ni movimientos en Bancos. */
async function sinRastro(accion: () => Promise<{ estado: number; cuerpo: { error: Record<string, unknown> } }>) {
  const antes = [await cuantosReintegros(), await cuantosMovimientosEn(e.cuentaBancariaId)];
  const respuesta = await accion();
  expect([await cuantosReintegros(), await cuantosMovimientosEn(e.cuentaBancariaId)]).toEqual(antes);
  return respuesta;
}

describe('el saldo libre de la nota', () => {
  it('no se devuelve más de lo que la nota tiene a favor, ni entre dos reintegros', async () => {
    const nota = await unaNota();

    const mayor = await sinRastro(() => intentar(depositoDe(e, nota.proveedor.proveedorId, [monto(nota, '100.01')])));
    await registrarReintegro(e.propietario(), efectivoDe(nota.proveedor.proveedorId, [monto(nota, '70.00')]));
    const segundo = await sinRastro(() => intentar(efectivoDe(nota.proveedor.proveedorId, [monto(nota, '30.01')])));

    expect(mayor.estado).toBe(400);
    expect(mayor.cuerpo.error).toMatchObject({
      codigo: 'reintegro_mayor_que_el_saldo_libre',
      detalles: { campo: 'notas.0.monto' },
    });
    expect(segundo.cuerpo.error).toMatchObject({ codigo: 'reintegro_mayor_que_el_saldo_libre' });
    expect(await ficha(nota.notaPropia)).toMatchObject({ saldo: '30.00', reintegrado: '70.00' });
  });

  it('con varias notas, el error dice cuál se pasó', async () => {
    const proveedor = await e.mundo.unProveedor();
    const primera = await notaConSaldoLibre(e, proveedor);
    const segunda = await notaConSaldoLibre(e, proveedor);

    const respuesta = await sinRastro(() =>
      intentar(efectivoDe(proveedor.proveedorId, [monto(primera, '50.00'), monto(segunda, '100.01')])),
    );

    expect(respuesta.cuerpo.error).toMatchObject({ detalles: { campo: 'notas.1.monto' } });
  });

  it('pide al menos una nota, montos mayores que cero y ninguna nota repetida', async () => {
    const nota = await unaNota();
    const proveedorId = nota.proveedor.proveedorId;

    const sinNotas = await intentar(efectivoDe(proveedorId, []));
    const enCero = await intentar(efectivoDe(proveedorId, [monto(nota, '0.00')]));
    const repetida = await intentar(efectivoDe(proveedorId, [monto(nota, '10.00'), monto(nota, '20.00')]));

    expect(sinNotas.cuerpo.error.codigo).toBe('reintegro_sin_notas');
    expect(enCero.cuerpo.error).toMatchObject({
      codigo: 'monto_de_reintegro_invalido',
      detalles: { campo: 'notas.0.monto' },
    });
    expect(repetida.cuerpo.error).toMatchObject({ codigo: 'nota_repetida_en_reintegro' });
  });
});

describe('qué notas se pueden reintegrar', () => {
  it('solo las del proveedor que devuelve el dinero', async () => {
    const nota = await unaNota();
    const otro = await e.mundo.unProveedor();

    const respuesta = await sinRastro(() => intentar(efectivoDe(otro.proveedorId, [monto(nota)])));

    expect(respuesta.cuerpo.error).toMatchObject({
      codigo: 'nota_de_otro_proveedor',
      detalles: { campo: 'notas.0.notaId' },
    });
  });

  it('una nota dentro de una contraseña vigente no se reintegra', async () => {
    const nota = await unaNota();
    const cargo = await e.cargoAutorizado(nota.proveedor);
    await e.autorizar(nota.notaPropia, { yaCompletado: true });
    await e.contrasena(nota.proveedor, [cargo, nota.notaPropia]);

    const respuesta = await sinRastro(() => intentar(efectivoDe(nota.proveedor.proveedorId, [monto(nota)])));

    expect(respuesta.cuerpo.error.codigo).toBe('nota_en_contrasena');
  });

  it('una nota pendiente en la bandeja, un cargo y una nota anulada no se reintegran', async () => {
    const pendiente = await unaNota({ completar: false });
    const cargo = await e.mundo.unCargo(await e.mundo.unProveedor());
    const anulada = await unaNota();
    const baja = await e
      .propietario()
      .post(`/api/cuentas-por-pagar/documentos/${anulada.notaPropia}/anular`, CAUSA_DE_BAJA);
    expect(baja.estado, JSON.stringify(baja.cuerpo)).toBe(200);

    const deLaBandeja = await intentar(efectivoDe(pendiente.proveedor.proveedorId, [monto(pendiente)]));
    const deUnCargo = await intentar(efectivoDe(pendiente.proveedor.proveedorId, [{ notaId: cargo, monto: '10.00' }]));
    const delAnulada = await intentar(efectivoDe(anulada.proveedor.proveedorId, [monto(anulada)]));

    expect(deLaBandeja.cuerpo.error.codigo).toBe('nota_pendiente_no_se_ajusta');
    expect(deUnCargo.cuerpo.error.codigo).toBe('no_es_nota_con_saldo');
    expect(delAnulada.cuerpo.error.codigo).toBe('no_es_nota_con_saldo');
  });

  it('el proveedor y la nota tienen que existir', async () => {
    const nota = await unaNota();

    const sinProveedor = await intentar(efectivoDe(crypto.randomUUID(), [monto(nota)]));
    const sinNota = await intentar(
      efectivoDe(nota.proveedor.proveedorId, [{ notaId: crypto.randomUUID(), monto: '10.00' }]),
    );

    expect(sinProveedor.estado).toBe(404);
    expect(sinNota.estado).toBe(404);
  });
});

describe('la fecha', () => {
  it('no puede ser futura ni anterior a la recepción de la nota', async () => {
    const nota = await unaNota();
    const proveedorId = nota.proveedor.proveedorId;

    const futura = await intentar(efectivoDe(proveedorId, [monto(nota)], { fecha: haceDias(-1) }));
    const anterior = await intentar(efectivoDe(proveedorId, [monto(nota)], { fecha: haceDias(10) }));

    for (const respuesta of [futura, anterior]) {
      expect(respuesta.cuerpo.error).toMatchObject({
        codigo: 'fecha_de_reintegro_invalida',
        detalles: { campo: 'fecha' },
      });
    }
    expect(anterior.cuerpo.error.mensaje).toContain(haceDias(3).split('-').reverse().join('/'));
  });
});

describe('permisos', () => {
  it('registrar pide reintegros.crear; ver la ficha y el recibo, documentos.ver', async () => {
    const nota = await unaNota();
    const cuerpo = efectivoDe(nota.proveedor.proveedorId, [monto(nota)]);

    const sin = await intentar(cuerpo, soloVer);
    const reintegro = await registrarReintegro(e.propietario(), cuerpo);
    const veFicha = await soloVer.get(`${RUTA_DE_REINTEGROS}/${reintegro.id}`);
    const veRecibo = await soloVer.get(`${RUTA_DE_REINTEGROS}/${reintegro.id}/recibo`);
    const noVe = await sinPermisos.get(`${RUTA_DE_REINTEGROS}/${reintegro.id}`);
    const noAnula = await soloVer.post(`${RUTA_DE_REINTEGROS}/${reintegro.id}/anular`, { motivo: 'x' });

    expect(sin.estado).toBe(403);
    expect([veFicha.estado, veRecibo.estado]).toEqual([200, 200]);
    expect([noVe.estado, noAnula.estado]).toEqual([403, 403]);
  });
});

describe('lo que el reintegro vigente impide a su nota', () => {
  it('la nota con un reintegro vigente no se anula ni se elimina, y sí cuando el reintegro se anula', async () => {
    const nota = await unaNota();
    const reintegro = await registrarReintegro(e.propietario(), efectivoDe(nota.proveedor.proveedorId, [monto(nota)]));
    const ruta = `/api/cuentas-por-pagar/documentos/${nota.notaPropia}`;

    const anular = await e.propietario().post(`${ruta}/anular`, CAUSA_DE_BAJA);
    const eliminar = await e.propietario().delete(ruta);

    for (const respuesta of [anular, eliminar]) expect(respuesta.cuerpo.error.codigo).toBe('nota_con_reintegros');
    const anulado = await e
      .propietario()
      .post(`${RUTA_DE_REINTEGROS}/${reintegro.id}/anular`, { motivo: 'Se devolvió' });
    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    const ahora = await e.propietario().post(`${ruta}/anular`, CAUSA_DE_BAJA);
    expect(ahora.estado, JSON.stringify(ahora.cuerpo)).toBe(200);
  });
});
