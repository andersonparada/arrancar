/**
 * Reaplicar un pago a otros cargos (CP4-4): un cheque ya cobrado que no se anula, la retención recalculada, el reparto por
 * activo fijo que Bancos vuelve a fijar, la auditoría `corregir`, el evento, la suma que no cambia, los cargos de otra
 * contraseña vigente del proveedor (M2) y de otro proveedor, y los permisos.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  anularPago,
  cuentaConFondos,
  iniciarEnero,
  MES_CONCILIADO,
  moverFechaDelPago,
  pagoEnBase,
  reaplicarPago,
} from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe, desgloseDe, movimientoDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let sinPermiso: ClienteApi;
const eventos: Array<{ pagoId: string; datos: Record<string, any> }> = [];

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagosreap');
  busEventos.suscribir('cuentas-por-pagar.pago_reaplicado', async (datos) => {
    eventos.push({ pagoId: datos.pagoId, datos: datos as unknown as Record<string, any> });
  });
  sinPermiso = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Solo anula',
    apellidos: 'Reaplicar',
    permisos: ['cuentas-por-pagar.pagos.ver', 'cuentas-por-pagar.pagos.anular'],
  });
});

afterAll(() => {
  eventos.length = 0;
});

const ficha = async (id: string) => (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${id}`)).cuerpo;

/** Un proveedor con dos cargos de Q 5,600.00 cada uno, en contraseñas distintas, y el primero (o los dos) pagados. */
async function dosCargos(activoElSegundo = false) {
  const proveedor = await e.mundo.unProveedor();
  const uno = await e.cargoAutorizado(proveedor, '5600.00');
  const dos = await e.cargoAutorizado(proveedor, '5600.00', activoElSegundo);
  const [contrasenaUno, contrasenaDos] = [await e.contrasena(proveedor, [uno]), await e.contrasena(proveedor, [dos])];
  return { proveedor, uno, dos, contrasenaUno, contrasenaDos };
}

async function pagarCheque(proveedorId: string, aplicaciones: Array<{ cargoId: string; monto: string }>) {
  const respuesta = await e.pagar(e.cheque(proveedorId, aplicaciones));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo;
}

describe('reaplicar un pago a otro cargo', () => {
  it('cambia los cargos sin cambiar el dinero: recalcula la retención, repara el desglose, audita y publica', async () => {
    const { proveedor, uno, dos } = await dosCargos(true);
    const retenciones = (await ficha(uno)).retenciones;
    const pago = await pagarCheque(proveedor.proveedorId, [{ cargoId: uno, monto: '1000.00' }]);
    expect(pago.aplicaciones[0].retencionDescontada).toBe(retenciones);

    const respuesta = await reaplicarPago(e.propietario(), pago.id, {
      motivo: 'Era de la otra factura',
      aplicaciones: [{ cargoId: dos, monto: '1000.00' }],
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({
      estado: 'vigente',
      monto: '1000.00',
      numero: pago.numero,
      fecha: pago.fecha,
    });
    expect(respuesta.cuerpo.aplicaciones).toHaveLength(1);
    expect(respuesta.cuerpo.aplicaciones[0]).toMatchObject({
      documentoId: dos,
      monto: '1000.00',
      retencionDescontada: (await ficha(dos)).retenciones,
    });
    expect(await ficha(uno)).toMatchObject({ saldo: '5510.00', estadoDePago: 'pendiente' });
    expect(await ficha(dos)).toMatchObject({ saldo: '4510.00', estadoDePago: 'en_parte' });
    expect(await auditoriaDe(pago.id)).toEqual([
      { accion: 'corregir', motivo: 'Era de la otra factura', recurso: 'cuentas-por-pagar.pagos' },
    ]);
    expect((await movimientoDe(e.propietario(), pago.movimiento.id)).conceptoNombre).toBe(
      'Pago a proveedores de activo fijo',
    );
    const evento = eventos.find((candidato) => candidato.pagoId === pago.id)!;
    expect(evento.datos.antes[0]).toMatchObject({ documentoId: uno, montoCentavos: 100000 });
    expect(evento.datos.despues[0]).toMatchObject({ documentoId: dos, montoCentavos: 100000, tieneActivoFijo: true });
    expect(evento.datos.fechaDelPago).toBe(pago.fecha);
  });

  it('con dos líneas, Bancos reparte lo nuevo entre Operación e Inversión', async () => {
    const { proveedor, uno, dos } = await dosCargos(true);
    const pago = await pagarCheque(proveedor.proveedorId, [{ cargoId: uno, monto: '1000.00' }]);

    await reaplicarPago(e.propietario(), pago.id, {
      motivo: 'Se reparte',
      aplicaciones: [
        { cargoId: uno, monto: '600.00' },
        { cargoId: dos, monto: '400.00' },
      ],
    });

    expect(await desgloseDe(pago.movimiento.id)).toEqual([
      { clave: 'pago_a_proveedor_de_activo', monto: '400.00' },
      { clave: 'pago_a_proveedor', monto: '600.00' },
    ]);
  });

  it('un cheque ya cobrado no se anula pero sí se reaplica', async () => {
    const cuenta = await cuentaConFondos(e.propietario(), 'Cuenta de reaplicados');
    const { proveedor, uno, dos } = await dosCargos();
    const respuesta = await e.pagar({
      ...e.cheque(proveedor.proveedorId, [{ cargoId: uno, monto: '800.00' }]),
      chequeraId: cuenta.chequeraId,
    });
    const pago = respuesta.cuerpo;
    await moverFechaDelPago(pago.id, MES_CONCILIADO);
    await iniciarEnero(e.propietario(), cuenta.cuentaBancariaId, [pago.movimiento.id]);
    expect((await anularPago(e.propietario(), pago.id)).cuerpo.error.codigo).toBe('pago_cobrado');

    const reaplicado = await reaplicarPago(e.propietario(), pago.id, {
      motivo: 'Cobrado',
      aplicaciones: [{ cargoId: dos, monto: '800.00' }],
    });

    expect(reaplicado.estado, JSON.stringify(reaplicado.cuerpo)).toBe(200);
    expect(await ficha(dos)).toMatchObject({ saldo: '4710.00' });
    expect(await pagoEnBase(pago.id)).toMatchObject({ estado: 'vigente', fecha_de_anulacion: null });
  });

  it('anula la diferencia de centavos del pago, que vuelve a ofrecerse', async () => {
    const { proveedor, uno, dos } = await dosCargos();
    const pago = await pagarCheque(proveedor.proveedorId, [{ cargoId: uno, monto: '5509.97' }]);
    await e.propietario().post(`/api/cuentas-por-pagar/pagos/${pago.id}/diferencias`, { cargoId: uno, monto: '0.03' });
    expect(await ficha(uno)).toMatchObject({ saldo: '0.00' });

    await reaplicarPago(e.propietario(), pago.id, {
      motivo: 'Otro cargo',
      aplicaciones: [{ cargoId: dos, monto: '5509.97' }],
    });

    const [ajuste] = await consultar<{ estado: string }>(
      'select estado from cuentas_por_pagar.ajustes_de_saldo where pago_id = $1',
      [pago.id],
    );
    expect(ajuste!.estado).toBe('anulado');
    expect(await ficha(uno)).toMatchObject({ saldo: '5510.00' });
  });
});

describe('lo que se rechaza al reaplicar', () => {
  it('otra suma, un cargo de otro proveedor, uno fuera de contraseña y un pago anulado', async () => {
    const { proveedor, uno, dos } = await dosCargos();
    const pago = await pagarCheque(proveedor.proveedorId, [{ cargoId: uno, monto: '1000.00' }]);
    const ajeno = (await e.proveedorConCargo()).cargo;
    const sinContrasena = await e.cargoAutorizado(proveedor);
    const rechaza = async (aplicaciones: Array<{ cargoId: string; monto: string }>, codigo: string) => {
      const respuesta = await reaplicarPago(e.propietario(), pago.id, { motivo: 'Prueba', aplicaciones });
      expect(respuesta.cuerpo.error?.codigo, JSON.stringify(respuesta.cuerpo)).toBe(codigo);
    };

    await rechaza([{ cargoId: dos, monto: '999.99' }], 'reaplicacion_con_otro_monto');
    await rechaza([{ cargoId: ajeno, monto: '1000.00' }], 'cargo_no_disponible');
    await rechaza([{ cargoId: sinContrasena, monto: '1000.00' }], 'documento_fuera_de_la_contrasena');
    await rechaza([{ cargoId: dos, monto: '6000.00' }], 'pago_mayor_que_el_saldo');
    expect(
      (await reaplicarPago(sinPermiso, pago.id, { motivo: 'x', aplicaciones: [{ cargoId: dos, monto: '1000.00' }] }))
        .estado,
    ).toBe(403);
    expect(await ficha(uno)).toMatchObject({ saldo: '4510.00' });

    await anularPago(e.propietario(), pago.id);
    await rechaza([{ cargoId: dos, monto: '1000.00' }], 'pago_ya_anulado');
  });

  it('un monto que no cabe en el saldo del cargo, sin contar este pago', async () => {
    const { proveedor, uno, dos } = await dosCargos();
    const pago = await pagarCheque(proveedor.proveedorId, [{ cargoId: uno, monto: '5000.00' }]);

    const cabe = await reaplicarPago(e.propietario(), pago.id, {
      motivo: 'Mismo cargo',
      aplicaciones: [{ cargoId: uno, monto: '5000.00' }],
    });
    const noCabe = await reaplicarPago(e.propietario(), pago.id, {
      motivo: 'No cabe',
      aplicaciones: [
        { cargoId: dos, monto: '5000.00' },
        { cargoId: dos, monto: '1.00' },
      ],
    });

    expect(cabe.estado, JSON.stringify(cabe.cuerpo)).toBe(200);
    expect(noCabe.estado).toBe(400);
  });
});
