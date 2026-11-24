/**
 * Pagar con una nota de débito ya registrada en Bancos y marcada para Cuentas por pagar (CP4-5): una nota cubre varios
 * pagos de varias contraseñas, lo que le queda por aplicar, las notas que no se pueden ligar, el reparto por activo fijo
 * que Cuentas por pagar fija en Bancos (también al reaplicar y al anular), lo que Bancos no deja cambiar mientras la nota
 * está ligada, la fecha contable de la anulación y los avisos de retención y de año anterior.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { anularPago, pagoEnBase, reaplicarPago } from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos, RUTA_DE_PAGOS } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, HOY, haceDias } from './soporte/escenario-de-documentos.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe, desgloseDe, movimientoDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let sinPermiso: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagosnota');
  sinPermiso = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Solo emite',
    apellidos: 'Nota ligada',
    permisos: ['cuentas-por-pagar.pagos.ver', 'cuentas-por-pagar.pagos.emitir'],
  });
});

const ficha = async (id: string) => (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${id}`)).cuerpo;

/** Una nota de débito de la cuenta, marcada para Cuentas por pagar (o suelta, con `marcada = false`). */
async function nota(monto: string, { marcada = true } = {}): Promise<string> {
  const propietario = e.propietario();
  const creada = await propietario.post('/api/bancos/notas', {
    cuentaBancariaId: e.cuentaBancariaId,
    tipo: 'debito',
    fecha: HOY,
    monto,
    referencia: 'Débito del banco',
    beneficiario: 'Aseguradora Prueba',
    observaciones: null,
    ...(marcada ? { marcarParaCuentasPorPagar: true } : { conceptoId: await conceptoGeneral(propietario) }),
  });
  expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
  return creada.cuerpo.id;
}

type Lineas = Array<{ cargoId: string; monto: string }>;

const ligarCon = (cuerpo: Record<string, unknown>) =>
  e.propietario().post(`${RUTA_DE_PAGOS}/ligar`, { forma: 'nota_ligada', ...cuerpo });

const ligar = (movimientoId: string, proveedorId: string, aplicaciones: Lineas) =>
  ligarCon({ movimientoId, proveedorId, aplicaciones });

const notasParaLigar = async (consulta = '') =>
  (await e.propietario().get(`${RUTA_DE_PAGOS}/notas-para-ligar${consulta}`)).cuerpo.elementos as Array<{
    movimientoId: string;
    monto: string;
    aplicado: string;
    disponible: string;
  }>;

describe('una nota cubre varios pagos', () => {
  it('baja su disponible con cada pago, sin crear otro movimiento, y deja de ofrecerse cuando se agota', async () => {
    const proveedor = await e.mundo.unProveedor();
    const [uno, dos] = [await e.cargoAutorizado(proveedor), await e.cargoAutorizado(proveedor, '500.00')];
    await e.contrasena(proveedor, [uno]);
    await e.contrasena(proveedor, [dos]);
    const id = await nota('1500.00');
    const movimientos = async () =>
      (await consultar<{ n: string }>('select count(*)::text as n from bancos.movimientos'))[0]!.n;
    const antes = await movimientos();

    const primero = await ligar(id, proveedor.proveedorId, [{ cargoId: uno, monto: '1000.00' }]);
    const mitad = (await notasParaLigar()).find((n) => n.movimientoId === id);
    const segundo = await ligar(id, proveedor.proveedorId, [{ cargoId: dos, monto: '500.00' }]);

    expect(primero.estado, JSON.stringify(primero.cuerpo)).toBe(201);
    expect(primero.cuerpo).toMatchObject({ forma: 'nota_ligada', monto: '1000.00', estado: 'vigente' });
    expect(primero.cuerpo.movimiento.id).toBe(id);
    expect(primero.cuerpo.beneficiario).toBe('Aseguradora Prueba');
    expect(mitad).toMatchObject({ monto: '1500.00', aplicado: '1000.00', disponible: '500.00' });
    expect(segundo.estado, JSON.stringify(segundo.cuerpo)).toBe(201);
    expect(await movimientos()).toBe(antes);
    expect((await notasParaLigar()).some((n) => n.movimientoId === id)).toBe(false);
    expect((await notasParaLigar('?soloConDisponible=false')).find((n) => n.movimientoId === id)).toMatchObject({
      aplicado: '1500.00',
      disponible: '0.00',
    });
    expect(await ficha(uno)).toMatchObject({ saldo: '120.00' });
  });

  it('no pasa de lo que le queda a la nota, ni dos pagos a la vez', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const id = await nota('1000.00');

    const demasiado = await ligar(id, proveedor.proveedorId, [{ cargoId: cargo, monto: '1100.00' }]);
    const paralelos = await Promise.all(
      [0, 1].map(() => ligar(id, proveedor.proveedorId, [{ cargoId: cargo, monto: '600.00' }])),
    );

    expect(demasiado.estado).toBe(400);
    expect(demasiado.cuerpo.error.codigo).toBe('pago_mayor_que_la_nota');
    expect(paralelos.map((r) => r.estado).sort()).toEqual([201, 400]);
    expect((await notasParaLigar()).find((n) => n.movimientoId === id)).toMatchObject({ disponible: '400.00' });
  });
});

describe('qué notas se pueden ligar y quién puede', () => {
  it('rechaza una nota sin marcar, una de crédito, una anulada y una que no existe', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const lineas = [{ cargoId: cargo, monto: '100.00' }];
    const suelta = await nota('300.00', { marcada: false });
    const anulada = await nota('300.00');
    await e.propietario().post(`/api/bancos/notas/${anulada}/anular`, { motivo: 'Error', fecha: HOY });
    const deposito = (
      await consultar<{ id: string }>("select id from bancos.movimientos where tipo = 'credito' limit 1")
    )[0]!;

    for (const movimientoId of [suelta, anulada, deposito.id, crypto.randomUUID()]) {
      const respuesta = await ligar(movimientoId, proveedor.proveedorId, lineas);
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(400);
      expect(respuesta.cuerpo.error.codigo).toBe('movimiento_no_ligable');
    }
    expect(await ficha(cargo)).toMatchObject({ saldo: '1120.00' });
  });

  it('pide su permiso propio, y la lista de notas, el mismo de ligar', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const id = await nota('300.00');

    const sinLigar = await sinPermiso.post(`${RUTA_DE_PAGOS}/ligar`, {
      ...{ forma: 'nota_ligada', movimientoId: id, proveedorId: proveedor.proveedorId },
      aplicaciones: [{ cargoId: cargo, monto: '100.00' }],
    });
    const lista = await sinPermiso.get(`${RUTA_DE_PAGOS}/notas-para-ligar`);

    expect(sinLigar.estado).toBe(403);
    expect(lista.estado).toBe(403);
  });

  it('la fecha de aplicar la nota no puede ser futura ni anterior a la emisión de los documentos', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const id = await nota('300.00');
    const lineas = [{ cargoId: cargo, monto: '100.00' }];

    const futura = await ligarCon({
      movimientoId: id,
      proveedorId: proveedor.proveedorId,
      aplicaciones: lineas,
      fecha: haceDias(-1),
    });
    const antigua = await ligarCon({
      movimientoId: id,
      proveedorId: proveedor.proveedorId,
      aplicaciones: lineas,
      fecha: haceDias(3),
    });

    for (const respuesta of [futura, antigua]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(400);
      expect(respuesta.cuerpo.error.codigo).toBe('fecha_de_pago_invalida');
    }
  });
});

describe('el reparto por activo fijo', () => {
  it('manda a Inversión solo lo ligado a activo fijo; lo no ligado sigue en Operación', async () => {
    const proveedor = await e.mundo.unProveedor();
    const activo = await e.cargoAutorizado(proveedor, '2240.00', true);
    await e.contrasena(proveedor, [activo]);
    const id = await nota('3360.00');

    const respuesta = await ligar(id, proveedor.proveedorId, [{ cargoId: activo, monto: '2240.00' }]);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(await desgloseDe(id)).toEqual([
      { clave: 'pago_a_proveedor', monto: '1120.00' },
      { clave: 'pago_a_proveedor_de_activo', monto: '2240.00' },
    ]);
    expect(await movimientoDe(e.propietario(), id)).toMatchObject({ marcadaParaModulo: 'cuentas-por-pagar' });
  });

  it('una nota que queda toda en Inversión sigue marcada, y al anular el pago el reparto vuelve y la fecha contable es hoy', async () => {
    const proveedor = await e.mundo.unProveedor();
    const activo = await e.cargoAutorizado(proveedor, '2240.00', true);
    await e.contrasena(proveedor, [activo]);
    const id = await nota('2240.00');
    const pago = (await ligar(id, proveedor.proveedorId, [{ cargoId: activo, monto: '2240.00' }])).cuerpo;

    expect(await desgloseDe(id)).toEqual([{ clave: 'pago_a_proveedor_de_activo', monto: '2240.00' }]);
    expect(await movimientoDe(e.propietario(), id)).toMatchObject({ marcadaParaModulo: 'cuentas-por-pagar' });
    const anulado = await anularPago(e.propietario(), pago.id, { motivo: 'Era otro documento' });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(await desgloseDe(id)).toEqual([]);
    expect(await pagoEnBase(pago.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: HOY, vigentes: '0' });
    expect((await notasParaLigar()).find((n) => n.movimientoId === id)).toMatchObject({ disponible: '2240.00' });
    expect((await movimientoDe(e.propietario(), id)).anuladoEn).toBeNull();
    expect((await auditoriaDe(pago.id)).map((a) => a.accion)).toContain('anular');
    expect(await ficha(activo)).toMatchObject({ saldo: '2240.00' });
  });

  it('reaplicar a un cargo de activo fijo vuelve a repartir la nota', async () => {
    const proveedor = await e.mundo.unProveedor();
    const [comun, activo] = [await e.cargoAutorizado(proveedor), await e.cargoAutorizado(proveedor, '2240.00', true)];
    await e.contrasena(proveedor, [comun, activo]);
    const id = await nota('1000.00');
    const pago = (await ligar(id, proveedor.proveedorId, [{ cargoId: comun, monto: '1000.00' }])).cuerpo;
    expect(await desgloseDe(id)).toEqual([]);

    const reaplicado = await reaplicarPago(e.propietario(), pago.id, {
      motivo: 'Era el activo',
      aplicaciones: [{ cargoId: activo, monto: '1000.00' }],
    });

    expect(reaplicado.estado, JSON.stringify(reaplicado.cuerpo)).toBe(200);
    expect(await desgloseDe(id)).toEqual([{ clave: 'pago_a_proveedor_de_activo', monto: '1000.00' }]);
  });
});

describe('lo que Bancos no deja cambiar mientras la nota está ligada', () => {
  it('rechaza desmarcar, anular, eliminar y corregir la nota, y la deja libre al anular el pago', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const id = await nota('800.00');
    const pago = (await ligar(id, proveedor.proveedorId, [{ cargoId: cargo, monto: '500.00' }])).cuerpo;
    const ruta = `/api/bancos/notas/${id}`;
    const conceptoId = await conceptoGeneral(e.propietario());

    const intentos = [
      await e.propietario().post(`${ruta}/desmarcar`, { motivo: 'Intento', conceptoId }),
      await e.propietario().post(`${ruta}/anular`, { motivo: 'Intento', fecha: HOY }),
      await e.propietario().delete(ruta, { motivo: 'Intento' }),
      await e.propietario().put(ruta, {
        ...{ cuentaBancariaId: e.cuentaBancariaId, tipo: 'debito', fecha: HOY, monto: '900.00', conceptoId },
        ...{ referencia: null, beneficiario: null, observaciones: null },
      }),
    ];

    for (const respuesta of intentos) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('movimiento_ligado_a_pagos');
    }
    await anularPago(e.propietario(), pago.id);
    const libre = await e.propietario().post(`${ruta}/desmarcar`, { motivo: 'Ya no se usará', conceptoId });
    expect(libre.estado, JSON.stringify(libre.cuerpo)).toBe(200);
  });
});

describe('los avisos al ligar', () => {
  it('avisa que el banco debitó sin descontar la retención y que la nota es de otro año', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('5600.00');
    const id = await nota('5600.00');
    await consultar('update bancos.movimientos set fecha = $2 where id = $1', [
      id,
      `${Number(HOY.slice(0, 4)) - 1}-12-20`,
    ]);

    const respuesta = await ligar(id, proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    const avisos: string[] = respuesta.cuerpo.avisos;
    expect(avisos.some((a) => a.includes('debitó la nota sin descontar la retención'))).toBe(true);
    expect(avisos.some((a) => a.includes('quedan Q4,600.00 de la nota por aplicar'))).toBe(true);
    expect(avisos.some((a) => a.includes('de otro año'))).toBe(true);
    expect(respuesta.cuerpo.aplicaciones[0].retencionDescontada).not.toBe('0.00');
  });
});
