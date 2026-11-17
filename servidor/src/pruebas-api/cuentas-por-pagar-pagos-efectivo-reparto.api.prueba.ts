/**
 * Repartir el efectivo de un retiro entre varios proveedores en una sola operación (CP4-E3): un pago y un recibo por
 * proveedor, todo o nada, el disponible, la retención, el desglose del retiro en Bancos, las fechas y los permisos.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  cuantosPagos,
  pagoEnEfectivo,
  pagosEnEfectivoDeLaBase,
  repartirBien,
  repartirMal,
  repartir,
  unRetiro,
} from './soporte/cuentas-por-pagar-efectivo.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { RUTA_DE_RETIROS } from './soporte/cuentas-por-pagar-retiros.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { desgloseDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let sinPermiso: ClienteApi;
let sinAjustes: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpefectivorep');
  const usuario = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, { nombres, apellidos: 'Efectivo', permisos });
  sinPermiso = await usuario('Sin pagar', ['cuentas-por-pagar.retiros.ver']);
  sinAjustes = await usuario('Paga', ['cuentas-por-pagar.retiros.ver', 'cuentas-por-pagar.pagos.pagar-en-efectivo']);
});

const ficha = async (id: string) => (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${id}`)).cuerpo;

describe('repartir un retiro', () => {
  it('paga a tres proveedores (uno con dos contraseñas) en una operación, con su recibo y el desglose del retiro', async () => {
    const [uno, dos, tres] = [await e.mundo.unProveedor(), await e.mundo.unProveedor(), await e.mundo.unProveedor()];
    const cargoUno = await e.cargoAutorizado(uno);
    const [cargoDos, cargoDos2] = [await e.cargoAutorizado(dos), await e.cargoAutorizado(dos, '1120.00', true)];
    const cargoTres = await e.cargoAutorizado(tres);
    await e.contrasena(uno, [cargoUno]);
    await e.contrasena(dos, [cargoDos]);
    await e.contrasena(dos, [cargoDos2]);
    await e.contrasena(tres, [cargoTres]);
    const retiro = await unRetiro(e, '5000.00');

    const respuesta = await repartirBien(e.propietario(), retiro.id, [
      pagoEnEfectivo(uno.proveedorId, [{ cargoId: cargoUno, monto: '1000.00' }], {
        recibidoPor: 'Ana Gómez',
        referencia: 'R-77',
      }),
      pagoEnEfectivo(dos.proveedorId, [
        { cargoId: cargoDos, monto: '500.00' },
        { cargoId: cargoDos2, monto: '300.00' },
      ]),
      pagoEnEfectivo(tres.proveedorId, [{ cargoId: cargoTres, monto: '200.00' }]),
    ]);

    expect(respuesta.pagos).toHaveLength(3);
    expect(respuesta.pagos.map((p: { monto: string }) => p.monto)).toEqual(['1000.00', '800.00', '200.00']);
    expect(respuesta.pagos[0]).toMatchObject({
      forma: 'efectivo',
      retiroId: retiro.id,
      recibidoPor: 'Ana Gómez',
      movimiento: null,
    });
    expect(respuesta.pagos[1].contrasenas).toHaveLength(2);
    expect(respuesta.retiro).toMatchObject({ pagado: '2000.00', disponible: '3000.00' });
    const numeros = respuesta.pagos.map((p: { numero: string }) => Number(p.numero.split('-').pop()));
    expect(numeros[1]).toBe(numeros[0] + 1);
    expect(numeros[2]).toBe(numeros[0] + 2);
    const guardados = await pagosEnEfectivoDeLaBase(retiro.id);
    expect(guardados).toHaveLength(3);
    expect(guardados[0]).toMatchObject({
      forma: 'efectivo',
      movimiento_id: null,
      referencia: 'R-77',
      motivo_sin_bancarizar: null,
    });
    expect(await desgloseDe(retiro.movimiento.id)).toEqual([
      { clave: 'pago_a_proveedor_de_activo', monto: '300.00' },
      { clave: 'pago_a_proveedor', monto: '1700.00' },
      { clave: 'efectivo_para_pagos', monto: '3000.00' },
    ]);
    expect(await ficha(cargoUno)).toMatchObject({ estadoDePago: 'en_parte' });
  });

  it('descuenta la retención en el primer pago y no en el segundo reparto', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('5600.00');
    const retencion = (await ficha(cargo)).retenciones;
    const retiro = await unRetiro(e, '3000.00');

    const primero = await repartirBien(e.propietario(), retiro.id, [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]),
    ]);
    const segundo = await repartirBien(e.propietario(), retiro.id, [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '500.00' }]),
    ]);

    expect(primero.pagos[0].aplicaciones[0]).toMatchObject({ retencionDescontada: retencion, monto: '1000.00' });
    expect(segundo.pagos[0].aplicaciones[0]).toMatchObject({ retencionDescontada: '0.00' });
  });

  it('salda la diferencia de centavos de un pago', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const retiro = await unRetiro(e, '2000.00');

    const respuesta = await repartirBien(e.propietario(), retiro.id, [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '1119.97' }], {
        diferencias: [{ cargoId: cargo, monto: '0.03' }],
      }),
    ]);

    expect(respuesta.pagos[0].diferencias).toEqual([{ cargoId: cargo, monto: '0.03' }]);
    expect(await ficha(cargo)).toMatchObject({ saldo: '0.00' });
  });
});

describe('lo que se rechaza', () => {
  it('un proveedor repetido en la operación', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const retiro = await unRetiro(e, '1000.00');
    const antes = await cuantosPagos();

    const error = await repartirMal(e.propietario(), retiro.id, {
      pagos: [
        pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '10.00' }]),
        pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '20.00' }]),
      ],
      estado: 400,
      codigo: 'proveedor_repetido_en_el_reparto',
    });

    expect(error.detalles).toMatchObject({ campo: 'pagos.1.proveedorId' });
    expect(await cuantosPagos()).toBe(antes);
  });

  it('más que el disponible del retiro, sin guardar nada', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const otro = await e.proveedorConCargo();
    const retiro = await unRetiro(e, '1000.00');
    const antes = await cuantosPagos();

    await repartirMal(e.propietario(), retiro.id, {
      pagos: [
        pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '600.00' }]),
        pagoEnEfectivo(otro.proveedor.proveedorId, [{ cargoId: otro.cargo, monto: '500.00' }]),
      ],
      estado: 400,
      codigo: 'pago_mayor_que_el_retiro',
    });

    expect(await cuantosPagos()).toBe(antes);
  });

  it('un pago malo hace fallar todo el reparto y dice en cuál proveedor', async () => {
    const bueno = await e.proveedorConCargo();
    const proveedor = await e.mundo.unProveedor();
    const sinAutorizar = await e.mundo.unCargo(proveedor);
    await e.contrasena(proveedor, [sinAutorizar]);
    const retiro = await unRetiro(e, '1000.00');
    const antes = await cuantosPagos();

    const error = await repartirMal(e.propietario(), retiro.id, {
      pagos: [
        pagoEnEfectivo(bueno.proveedor.proveedorId, [{ cargoId: bueno.cargo, monto: '100.00' }]),
        pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: sinAutorizar, monto: '100.00' }]),
      ],
      estado: 422,
      codigo: 'documento_sin_autorizar',
    });

    expect(error.detalles).toMatchObject({ pago: 1 });
    expect(await cuantosPagos()).toBe(antes);
    expect((await e.propietario().get(`${RUTA_DE_RETIROS}/${retiro.id}`)).cuerpo).toMatchObject({ pagado: '0.00' });
  });

  it('una fecha anterior al retiro o futura', async () => {
    const proveedor = await e.mundo.unProveedor();
    const cargo = await e.cargoAutorizado(proveedor);
    await e.contrasena(proveedor, [cargo]);
    const retiro = await unRetiro(e, '1000.00', { fecha: haceDias(1) });
    const pago = (fecha: string) => [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '10.00' }], { fecha }),
    ];

    const antes = await repartirMal(e.propietario(), retiro.id, {
      pagos: pago(haceDias(2)),
      estado: 400,
      codigo: 'fecha_de_pago_invalida',
    });
    await repartirMal(e.propietario(), retiro.id, {
      pagos: pago(haceDias(-1)),
      estado: 400,
      codigo: 'fecha_de_pago_invalida',
    });

    expect(antes.detalles).toMatchObject({ campo: 'pagos.0.fecha' });
  });

  it('de 1 a 20 pagos', async () => {
    const retiro = await unRetiro(e, '1000.00');
    const falso = (n: number) =>
      pagoEnEfectivo(crypto.randomUUID(), [{ cargoId: crypto.randomUUID(), monto: `${n + 1}.00` }]);

    await repartirMal(e.propietario(), retiro.id, { pagos: [], estado: 400, codigo: 'demasiados_pagos_en_el_reparto' });
    await repartirMal(e.propietario(), retiro.id, {
      pagos: Array.from({ length: 21 }, (_, n) => falso(n)),
      estado: 400,
      codigo: 'demasiados_pagos_en_el_reparto',
    });
  });

  it('un retiro liquidado, anulado o que no existe', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pagos = [pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '10.00' }])];
    const liquidado = await unRetiro(e, '500.00');
    const liquidar = await e
      .propietario()
      .post(`${RUTA_DE_RETIROS}/${liquidado.id}/liquidar`, { devuelto: '500.00', faltante: '0.00' });
    expect(liquidar.estado, JSON.stringify(liquidar.cuerpo)).toBe(200);
    const anulado = await unRetiro(e, '500.00');
    await e.propietario().post(`${RUTA_DE_RETIROS}/${anulado.id}/anular`, { motivo: 'Error' });

    for (const id of [liquidado.id, anulado.id, crypto.randomUUID()]) {
      await repartirMal(e.propietario(), id, { pagos, estado: 400, codigo: 'retiro_no_disponible' });
    }
  });
});

describe('permisos', () => {
  it('pagar en efectivo pide pagos.pagar-en-efectivo, las diferencias ajustes.crear y el motivo de la excepción su permiso', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const retiro = await unRetiro(e, '1000.00');
    const simple = [pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '100.00' }])];
    const conDiferencia = [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '1119.50' }], {
        diferencias: [{ cargoId: cargo, monto: '0.50' }],
      }),
    ];
    const conMotivo = [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '100.00' }], { motivoSinBancarizar: 'Urgente' }),
    ];

    expect((await repartir(sinPermiso, retiro.id, simple)).estado).toBe(403);
    expect((await repartir(sinAjustes, retiro.id, conDiferencia)).estado).toBe(403);
    expect((await repartir(sinAjustes, retiro.id, conMotivo)).estado).toBe(403);
    expect((await repartir(sinAjustes, retiro.id, simple)).estado).toBe(201);
    expect((await consultar('select 1 from cuentas_por_pagar.pagos where fecha = $1', [HOY])).length).toBeGreaterThan(
      0,
    );
  });
});
