/**
 * Anular, eliminar o corregir desde Bancos lo que emitió Cuentas por pagar (CP4-4): el aviso `bancos.movimiento_por_cambiar`
 * anula el pago con la forma y la fecha del inverso que trae, el cheque cobrado y todo cambio que no sea anular se rechazan,
 * la anulación en lote de cheques caducos y la idempotencia del aviso.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { mediador } from '../modulos/core/mediador/contexto.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  anularPago,
  cerrarEnero,
  chequeDelPago,
  cuentaConFondos,
  inversoDe,
  iniciarEnero,
  MES_CONCILIADO,
  moverFechaDelPago,
  pagoEnBase,
} from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { operadorDeLaCuenta } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let autoriza: ClienteApi;
let enero: { cuentaBancariaId: string; chequeraId: string };

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagosaviso');
  autoriza = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Avisos',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
  enero = await cuentaConFondos(e.propietario(), 'Cuenta de avisos');
});

/** Un cheque de la cuenta principal o de `enero`, para un cargo nuevo del monto dado. */
async function pagarConCheque(monto: string, cuenta: { chequeraId: string } = e) {
  const { proveedor, cargo } = await e.proveedorConCargo();
  const respuesta = await e.pagar({
    ...e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto }]),
    chequeraId: cuenta.chequeraId,
  });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return { pago: respuesta.cuerpo, proveedor, cargo };
}

const ficha = async (id: string) => (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${id}`)).cuerpo;

describe('anular el cheque desde Bancos', () => {
  it('en un mes abierto anula el pago sin inverso y su fecha contable es la del pago', async () => {
    const { pago, cargo } = await pagarConCheque('900.00');

    const anulado = await e.propietario().post(`/api/bancos/cheques/${await chequeDelPago(pago.id)}/anular`, {
      motivo: 'Se perdió',
    });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(await pagoEnBase(pago.id)).toMatchObject({
      estado: 'anulado',
      fecha_de_anulacion: pago.fecha,
      vigentes: '0',
    });
    expect(await ficha(cargo)).toMatchObject({ saldo: '1120.00', estadoDePago: 'pendiente' });
  });

  it('en un mes conciliado anula el pago con inverso y su fecha contable es la del inverso', async () => {
    const { pago } = await pagarConCheque('650.00', enero);
    await moverFechaDelPago(pago.id, MES_CONCILIADO);
    await cerrarEnero(e.propietario(), autoriza, await iniciarEnero(e.propietario(), enero.cuentaBancariaId));

    const anulado = await e.propietario().post(`/api/bancos/cheques/${await chequeDelPago(pago.id)}/anular`, {
      motivo: 'Caducó',
      fecha: HOY,
    });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect((await inversoDe(pago.movimiento.id))?.fecha).toBe(HOY);
    expect(await pagoEnBase(pago.id)).toMatchObject({
      estado: 'anulado',
      fecha: MES_CONCILIADO,
      fecha_de_anulacion: HOY,
    });
  });

  it('la anulación en lote de cheques caducos anula sus pagos con la fecha común del inverso', async () => {
    const [uno, dos] = [await pagarConCheque('300.00', enero), await pagarConCheque('310.00', enero)];
    for (const { pago } of [uno, dos]) await moverFechaDelPago(pago.id, MES_CONCILIADO);

    const lote = await e.propietario().post('/api/bancos/cheques/anular-en-lote', {
      chequeIds: [await chequeDelPago(uno.pago.id), await chequeDelPago(dos.pago.id)],
      motivo: 'Cheques caducos',
      fecha: HOY,
    });

    expect(lote.estado, JSON.stringify(lote.cuerpo)).toBe(200);
    for (const { pago } of [uno, dos]) {
      expect(await pagoEnBase(pago.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: HOY });
    }
  });

  it('un cheque ya conciliado (cobrado) no se anula ni aquí ni desde Bancos', async () => {
    const cuenta = await cuentaConFondos(e.propietario(), 'Cuenta de cobrados');
    const { pago, cargo } = await pagarConCheque('500.00', cuenta);
    await moverFechaDelPago(pago.id, MES_CONCILIADO);
    await iniciarEnero(e.propietario(), cuenta.cuentaBancariaId, [pago.movimiento.id]);

    const desdeAqui = await anularPago(e.propietario(), pago.id);
    const desdeBancos = await e.propietario().post(`/api/bancos/cheques/${await chequeDelPago(pago.id)}/anular`, {
      motivo: 'Intento',
    });

    for (const respuesta of [desdeAqui, desdeBancos]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('pago_cobrado');
    }
    expect(await pagoEnBase(pago.id)).toMatchObject({ estado: 'vigente', fecha_de_anulacion: null, vigentes: '1' });
    expect(await ficha(cargo)).toMatchObject({ saldo: '620.00' });
  });
});

describe('lo que Bancos no puede hacer con un movimiento de un pago', () => {
  it('no blanquea el cheque ni elimina, corrige o anula la nota con el pago vigente, y la nota anulada anula el pago', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const { cuerpo: pago } = await e.pagar(e.nota(proveedor.proveedorId, [{ cargoId: cargo, monto: '200.00' }]));
    const ruta = `/api/bancos/notas/${pago.movimiento.id}`;

    const eliminar = await e.propietario().delete(ruta, { motivo: 'Intento' });
    const corregir = await e.propietario().put(ruta, { monto: '300.00' });

    for (const respuesta of [eliminar, corregir])
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBeGreaterThanOrEqual(400);
    expect(await pagoEnBase(pago.id)).toMatchObject({ estado: 'vigente' });
    const anulada = await e.propietario().post(`${ruta}/anular`, { motivo: 'La nota era un error', fecha: HOY });
    expect(anulada.estado, JSON.stringify(anulada.cuerpo)).toBe(200);
    expect(await pagoEnBase(pago.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: HOY });
    expect(await ficha(cargo)).toMatchObject({ saldo: '1120.00' });
  });

  it('el aviso rechaza eliminar, blanquear y corregir con los errores del módulo, y es idempotente', async () => {
    const { pago } = await pagarConCheque('120.00');
    const operador = await operadorDeLaCuenta(e.mundo.escenario.cuenta);
    const aviso = (cambio: 'eliminar' | 'blanquear' | 'corregir' | 'anular') => ({
      movimientoId: pago.movimiento.id,
      moduloDeOrigen: 'cuentas-por-pagar',
      documentoDeOrigenId: pago.id,
      cambio,
      formaDeAnulacion: cambio === 'anular' ? ('sin_inverso' as const) : null,
      motivo: 'Prueba',
      fecha: null,
    });

    for (const cambio of ['eliminar', 'blanquear', 'corregir'] as const) {
      await expect(mediador.avisar(operador, 'bancos.movimiento_por_cambiar', aviso(cambio))).rejects.toMatchObject({
        codigo: 'movimiento_de_cuentas_por_pagar',
      });
    }
    await mediador.avisar(operador, 'bancos.movimiento_por_cambiar', aviso('anular'));
    await mediador.avisar(operador, 'bancos.movimiento_por_cambiar', aviso('anular'));
    await expect(mediador.avisar(operador, 'bancos.movimiento_por_cambiar', aviso('eliminar'))).rejects.toMatchObject({
      codigo: 'movimiento_con_pagos_anulados',
    });
    await mediador.avisar(operador, 'bancos.movimiento_por_cambiar', {
      ...aviso('eliminar'),
      movimientoId: crypto.randomUUID(),
    });
    expect(await pagoEnBase(pago.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: pago.fecha });
  });
});
