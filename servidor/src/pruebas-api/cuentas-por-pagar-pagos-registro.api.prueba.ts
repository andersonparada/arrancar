/**
 * Pagar con cheque y con nota de débito (CP4-3): el movimiento en Bancos con su origen y beneficiario, la retención en el
 * primer pago, el posfechado comprometido, el desglose por activo fijo, un cheque para varias contraseñas del proveedor y
 * los saldos iniciales.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias } from './soporte/escenario-de-documentos.js';
import { desgloseDe, movimientoDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagosreg');
});

const ficha = async (id: string) => (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${id}`)).cuerpo;

describe('pagar con cheque', () => {
  it('emite el cheque a nombre del NIT con el pago como origen y baja el saldo', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();

    const respuesta = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1120.00' }]));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    const pago = respuesta.cuerpo;
    expect(pago).toMatchObject({ forma: 'cheque', monto: '1120.00', posfechado: false, estado: 'vigente' });
    expect(pago.beneficiario).toMatch(/S\.A\.$/);
    const cheque = await movimientoDe(e.propietario(), pago.movimiento.id);
    expect(cheque).toMatchObject({
      tipo: 'cheque',
      monto: '1120.00',
      beneficiario: pago.beneficiario,
      moduloDeOrigen: 'cuentas-por-pagar',
      documentoDeOrigenId: pago.id,
      conceptoNombre: 'Pago a proveedores',
    });
    const [fila] = await consultar<{ no_negociable: boolean }>(
      'select no_negociable from bancos.cheques where movimiento_id = $1',
      [pago.movimiento.id],
    );
    expect(fila!.no_negociable).toBe(true);
    expect(await ficha(cargo)).toMatchObject({ saldo: '0.00', estadoDePago: 'pagado' });
  });

  it('descuenta la retención en el primer pago y no en el segundo', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('5600.00');
    const retencion = (await ficha(cargo)).retenciones;
    expect(Number(retencion)).toBeGreaterThan(0);

    const primero = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1000.00' }]));
    const segundo = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '500.00' }]));

    const [lineaUno] = primero.cuerpo.aplicaciones;
    expect(lineaUno).toMatchObject({ retencionDescontada: retencion, monto: '1000.00' });
    expect(Number(lineaUno.cubre)).toBe(1000 + Number(retencion));
    expect(segundo.cuerpo.aplicaciones[0]).toMatchObject({ retencionDescontada: '0.00', cubre: '500.00' });
    expect(primero.cuerpo.avisos.join(' ')).toContain('no tiene constancia registrada');
  });

  it('un cheque posfechado compromete el documento y avisa que se paga a la vista', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();

    const respuesta = await e.pagar(
      e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1120.00' }], { fecha: haceDias(-5) }),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.posfechado).toBe(true);
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('se paga a la vista');
    expect(await ficha(cargo)).toMatchObject({ estadoDePago: 'comprometido', comprometido: '1120.00', saldo: '0.00' });
  });

  it('un cheque para dos contraseñas del mismo proveedor pasa y uno con un cargo de otro proveedor se rechaza', async () => {
    const proveedor = await e.mundo.unProveedor();
    const [uno, dos] = [await e.cargoAutorizado(proveedor), await e.cargoAutorizado(proveedor, '500.00')];
    const [contrasenaUno, contrasenaDos] = [await e.contrasena(proveedor, [uno]), await e.contrasena(proveedor, [dos])];
    const ajeno = (await e.proveedorConCargo()).cargo;
    const lineas = [
      { cargoId: uno, monto: '1120.00' },
      { cargoId: dos, monto: '500.00' },
    ];

    const rechazo = await e.pagar(e.cheque(proveedor.proveedorId, [...lineas, { cargoId: ajeno, monto: '10.00' }]));
    const pago = await e.pagar(e.cheque(proveedor.proveedorId, lineas));

    expect(rechazo.estado).toBe(400);
    expect(rechazo.cuerpo.error.codigo).toBe('cargo_no_disponible');
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);
    expect(pago.cuerpo.contrasenas.map((c: { id: string }) => c.id).sort()).toEqual(
      [contrasenaUno, contrasenaDos].sort(),
    );
    expect(pago.cuerpo.monto).toBe('1620.00');
  });

  it('con un cargo de activo fijo, Bancos reparte el cheque entre Operación e Inversión', async () => {
    const proveedor = await e.mundo.unProveedor();
    const [comun, activo] = [await e.cargoAutorizado(proveedor), await e.cargoAutorizado(proveedor, '2240.00', true)];
    await e.contrasena(proveedor, [comun, activo]);

    const respuesta = await e.pagar(
      e.cheque(proveedor.proveedorId, [
        { cargoId: comun, monto: '1120.00' },
        { cargoId: activo, monto: '2240.00' },
      ]),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(await desgloseDe(respuesta.cuerpo.movimiento.id)).toEqual([
      { clave: 'pago_a_proveedor', monto: '1120.00' },
      { clave: 'pago_a_proveedor_de_activo', monto: '2240.00' },
    ]);
  });
});

describe('pagar con nota de débito', () => {
  it('registra la nota en la cuenta con el pago como origen', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();

    const respuesta = await e.pagar(e.nota(proveedor.proveedorId, [{ cargoId: cargo, monto: '600.00' }]));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({ forma: 'nota_de_debito', monto: '600.00' });
    expect(await movimientoDe(e.propietario(), respuesta.cuerpo.movimiento.id)).toMatchObject({
      tipo: 'debito',
      moduloDeOrigen: 'cuentas-por-pagar',
      documentoDeOrigenId: respuesta.cuerpo.id,
    });
    expect(await ficha(cargo)).toMatchObject({ estadoDePago: 'en_parte', saldo: '520.00' });
  });
});

describe('un saldo inicial', () => {
  it('no descuenta retención y avisa de las que están por practicar', async () => {
    const saldo = await e.mundo.documentos.sembrarSaldoInicial();
    await e.autorizar(saldo, { yaCompletado: true });
    const proveedorId = e.mundo.escenario.proveedorId;
    await e.contrasena({ proveedorId, nitEmisor: '' }, [saldo]);

    const respuesta = await e.pagar(e.cheque(proveedorId, [{ cargoId: saldo, monto: '700.00' }]));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo.aplicaciones[0]).toMatchObject({ retencionDescontada: '0.00', cubre: '700.00' });
    expect(respuesta.cuerpo.avisos.join(' ')).toContain('Q50.00 de retenciones por practicar');
    const [fila] = await consultar<{ n: string }>(
      'select count(*)::text as n from cuentas_por_pagar.aplicaciones_de_pagos where pago_id = $1 and retencion_descontada > 0',
      [respuesta.cuerpo.id],
    );
    expect(fila!.n).toBe('0');
  });
});
