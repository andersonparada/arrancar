/**
 * La bancarización del pago en efectivo (CP4-E3): el umbral por cargo, por pago y por mes según el régimen de la empresa y del
 * documento, la excepción con permiso y motivo, el aviso sin datos fiscales, el efectivo que suma en el aviso del cheque, dos
 * repartos a la vez al mismo proveedor y el aviso al registrar el retiro.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  cuantosPagos,
  pagoEnEfectivo,
  pagosEnEfectivoDeLaBase,
  repartir,
  repartirBien,
  repartirMal,
  unRetiro,
} from './soporte/cuentas-por-pagar-efectivo.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let conExcepcion: ClienteApi;
let sinExcepcion: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpefectivobanc');
  await e.fondear('200000.00');
  sinExcepcion = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Sin excepción',
    apellidos: 'Efectivo',
    permisos: ['cuentas-por-pagar.retiros.ver', 'cuentas-por-pagar.pagos.pagar-en-efectivo'],
  });
  conExcepcion = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Con excepción',
    apellidos: 'Efectivo',
    permisos: [
      'cuentas-por-pagar.retiros.ver',
      'cuentas-por-pagar.pagos.pagar-en-efectivo',
      'cuentas-por-pagar.pagos.efectivo-sin-bancarizar',
    ],
  });
});

describe('empresa del régimen general', () => {
  it('un cargo de Q30,000 o más, aunque se pague por partes, se rechaza con el texto de la bancarización', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('30000.00');
    const retiro = await unRetiro(e, '5000.00');
    const antes = await cuantosPagos();

    const error = await repartirMal(sinExcepcion, retiro.id, {
      pagos: [pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }])],
      estado: 422,
      codigo: 'efectivo_sobre_el_umbral',
    });

    expect(error.mensaje).toContain('Decreto 20-2006, art. 20');
    expect(error.mensaje).toContain('no es deducible del ISR');
    expect(error.mensaje).toContain('crédito fiscal');
    expect(error.detalles).toMatchObject({ campo: 'pagos.0.motivoSinBancarizar', pago: 0 });
    expect(await cuantosPagos()).toBe(antes);
  });

  it('con el permiso exige el motivo y con él deja pagar, guardándolo en el pago', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('30000.00');
    const retiro = await unRetiro(e, '5000.00');
    const pago = (cambios = {}) => [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }], cambios),
    ];

    await repartirMal(conExcepcion, retiro.id, {
      pagos: pago(),
      estado: 400,
      codigo: 'motivo_sin_bancarizar_obligatorio',
    });
    const respuesta = await repartirBien(
      conExcepcion,
      retiro.id,
      pago({ motivoSinBancarizar: 'El proveedor solo recibe efectivo' }),
    );

    expect(respuesta.pagos[0].motivoSinBancarizar).toBe('El proveedor solo recibe efectivo');
    expect(respuesta.pagos[0].avisos.join(' ')).toContain('Bancarización (Decreto 20-2006');
    const [guardado] = await pagosEnEfectivoDeLaBase(retiro.id);
    expect(guardado!.motivo_sin_bancarizar).toBe('El proveedor solo recibe efectivo');
  });

  it('lo pagado en el mes al proveedor, con todas las formas, lo lleva al umbral', async () => {
    const proveedor = await e.mundo.unProveedor();
    const [uno, dos] = [await e.cargoAutorizado(proveedor, '20000.00'), await e.cargoAutorizado(proveedor, '15000.00')];
    await e.contrasena(proveedor, [uno, dos]);
    const retiro = await unRetiro(e, '40000.00');

    await repartirBien(e.propietario(), retiro.id, [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: uno, monto: '19000.00' }]),
    ]);
    const error = await repartirMal(sinExcepcion, retiro.id, {
      pagos: [pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: dos, monto: '14000.00' }])],
      estado: 422,
      codigo: 'efectivo_sobre_el_umbral',
    });

    expect(error.mensaje).toContain('llega a Q33,000.00');
  });

  it('el cheque que lleva el mes al umbral avisa que el efectivo previo deja de respaldar el gasto', async () => {
    const proveedor = await e.mundo.unProveedor();
    const [grande, otro] = [
      await e.cargoAutorizado(proveedor, '25000.00'),
      await e.cargoAutorizado(proveedor, '9000.00'),
    ];
    await e.contrasena(proveedor, [grande, otro]);
    const retiro = await unRetiro(e, '25000.00');
    const efectivo = await repartirBien(e.propietario(), retiro.id, [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: grande, monto: '24000.00' }]),
    ]);

    const cheque = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: otro, monto: '7000.00' }]));

    expect(cheque.estado, JSON.stringify(cheque.cuerpo)).toBe(201);
    expect(cheque.cuerpo.avisos.join(' ')).toContain(
      `los pagos en efectivo de ese mes (recibos ${efectivo.pagos[0].numero})`,
    );
  });

  it('dos repartos a la vez al mismo proveedor: el segundo ve lo que pagó el primero', async () => {
    const proveedor = await e.mundo.unProveedor();
    const [uno, dos] = [await e.cargoAutorizado(proveedor, '20000.00'), await e.cargoAutorizado(proveedor, '20000.00')];
    await e.contrasena(proveedor, [uno, dos]);
    const [retiroUno, retiroDos] = [await unRetiro(e, '20000.00'), await unRetiro(e, '20000.00')];
    const pagar = (retiro: { id: string }, cargoId: string) =>
      repartir(sinExcepcion, retiro.id, [pagoEnEfectivo(proveedor.proveedorId, [{ cargoId, monto: '19000.00' }])]);

    const [a, b] = await Promise.all([pagar(retiroUno, uno), pagar(retiroDos, dos)]);

    expect([a.estado, b.estado].sort()).toEqual([201, 422]);
  });
});

describe('aviso al sacar el efectivo', () => {
  it('un retiro de Q30,000 o más avisa lo que se pierde con el régimen de la empresa; uno menor, no', async () => {
    const grande = await unRetiro(e, '35000.00');
    const chico = await unRetiro(e, '100.00');

    expect(grande.avisos.join(' ')).toContain('Va a sacar Q35,000.00 en efectivo');
    expect(grande.avisos.join(' ')).toContain('el costo para el ISR y el crédito fiscal del IVA');
    expect(chico.avisos.join(' ')).not.toContain('Va a sacar');
  });
});

describe('empresa pequeño contribuyente', () => {
  it('sin crédito fiscal ni ISR sobre utilidades, ni avisa ni bloquea', async () => {
    const pequeno = await EscenarioDePagos.preparar(entorno, 'cxpefectivopeq', {
      regimenIva: 'pequeno_contribuyente',
      agenteDeRetencionIva: 'ninguno',
    });
    const { proveedor, cargo } = await pequeno.proveedorConCargo('30000.00');
    await pequeno.fondear('50000.00');
    const retiro = await unRetiro(pequeno, '35000.00');

    const respuesta = await repartirBien(pequeno.propietario(), retiro.id, [
      pagoEnEfectivo(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]),
    ]);

    expect(retiro.avisos.join(' ')).not.toContain('Va a sacar');
    expect(respuesta.pagos[0].avisos.join(' ')).not.toContain('Bancarización');
    expect(respuesta.pagos[0].motivoSinBancarizar).toBeNull();
  });
});
