/**
 * Anular y reaplicar un pago en efectivo (CP4-E3): el disponible y el desglose del retiro vuelven, la fecha contable de la
 * anulación, la auditoría, el retiro liquidado que no deja anular y la reaplicación entre contraseñas del proveedor.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  pagoEnEfectivo,
  pagosEnEfectivoDeLaBase,
  repartirBien,
  unRetiro,
} from './soporte/cuentas-por-pagar-efectivo.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { RUTA_DE_RETIROS } from './soporte/cuentas-por-pagar-retiros.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY } from './soporte/escenario-de-documentos.js';
import { auditoriaDe, desgloseDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpefectivoanul');
});

const anular = (id: string, motivo = 'Se pagó al proveedor equivocado') =>
  e.propietario().post(`/api/cuentas-por-pagar/pagos/${id}/anular`, { motivo });

const retiroDe = async (id: string) => (await e.propietario().get(`${RUTA_DE_RETIROS}/${id}`)).cuerpo;

describe('anular un pago en efectivo', () => {
  it('devuelve el disponible y el desglose, fecha la anulación hoy, la audita y libera la retención', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('5600.00');
    const retiro = await unRetiro(e, '3000.00');
    const reparto = await repartirBien(e.propietario(), retiro.id, [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]),
    ]);
    const pagoId = reparto.pagos[0].id;

    const respuesta = await anular(pagoId);

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ estado: 'anulado', anulacion: { fecha: HOY } });
    expect(await retiroDe(retiro.id)).toMatchObject({ pagado: '0.00', disponible: '3000.00' });
    expect(await desgloseDe(retiro.movimiento.id)).toEqual([]);
    const [guardado] = await pagosEnEfectivoDeLaBase(retiro.id);
    expect(guardado).toMatchObject({ estado: 'anulado', fecha_de_anulacion: HOY });
    expect(await auditoriaDe(pagoId)).toEqual([
      { accion: 'anular', motivo: 'Se pagó al proveedor equivocado', recurso: 'cuentas-por-pagar.pagos' },
    ]);
    const otro = await repartirBien(e.propietario(), retiro.id, [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '500.00' }]),
    ]);
    expect(Number(otro.pagos[0].aplicaciones[0].retencionDescontada)).toBeGreaterThan(0);
  });

  it('con el retiro liquidado se rechaza; reabierto, se puede', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const retiro = await unRetiro(e, '1000.00');
    const reparto = await repartirBien(e.propietario(), retiro.id, [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '400.00' }]),
    ]);
    const pagoId = reparto.pagos[0].id;
    const liquidado = await e
      .propietario()
      .post(`${RUTA_DE_RETIROS}/${retiro.id}/liquidar`, { devuelto: '600.00', faltante: '0.00' });
    expect(liquidado.estado, JSON.stringify(liquidado.cuerpo)).toBe(200);

    const rechazado = await anular(pagoId);
    await e.propietario().post(`${RUTA_DE_RETIROS}/${retiro.id}/reabrir`, { motivo: 'Faltaba corregir un pago' });
    const permitido = await anular(pagoId);

    expect(rechazado.estado).toBe(422);
    expect(rechazado.cuerpo.error.codigo).toBe('retiro_liquidado');
    expect(permitido.estado, JSON.stringify(permitido.cuerpo)).toBe(200);
  });
});

describe('reaplicar un pago en efectivo', () => {
  it('cambia los cargos entre contraseñas del proveedor, también con el retiro liquidado, y reparte el desglose', async () => {
    const proveedor = await e.mundo.unProveedor();
    const [gasto, activo] = [await e.cargoAutorizado(proveedor), await e.cargoAutorizado(proveedor, '1120.00', true)];
    await e.contrasena(proveedor, [gasto]);
    await e.contrasena(proveedor, [activo]);
    const retiro = await unRetiro(e, '1000.00');
    const reparto = await repartirBien(e.propietario(), retiro.id, [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: gasto, monto: '300.00' }]),
    ]);
    await e.propietario().post(`${RUTA_DE_RETIROS}/${retiro.id}/liquidar`, { devuelto: '700.00', faltante: '0.00' });

    const respuesta = await e.propietario().post(`/api/cuentas-por-pagar/pagos/${reparto.pagos[0].id}/reaplicar`, {
      motivo: 'Era el activo',
      aplicaciones: [{ cargoId: activo, monto: '300.00' }],
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.aplicaciones[0].documentoId).toBe(activo);
    expect(await desgloseDe(retiro.movimiento.id)).toEqual([
      { clave: 'pago_a_proveedor_de_activo', monto: '300.00' },
      { clave: 'efectivo_para_pagos', monto: '700.00' },
    ]);
  });
});
