/**
 * Liquidar y reabrir un retiro de efectivo: lo devuelto (depósito en Bancos), el faltante con su motivo y su auditoría, el
 * reparto por concepto del cheque o la nota, lo que no cuadra, las fechas, el aviso del custodio que liquida su propio
 * retiro y reabrir (desde aquí y anulando el depósito en Bancos).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  conceptoDelMovimiento,
  movimientoDelRetiro,
  registrarRetiro,
  retiroConCheque,
  retiroEnBase,
  RUTA_DE_RETIROS,
  sembrarPagoDelRetiro,
} from './soporte/cuentas-por-pagar-retiros.js';
import {
  cerrarEnero,
  cuentaConFondos,
  iniciarEnero,
  MES_CONCILIADO,
} from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe, desgloseDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let autoriza: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpretirosliq');
  autoriza = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Liquidar',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
});

const liquidar = (id: string, cuerpo: Record<string, unknown>, cliente: ClienteApi = e.propietario()) =>
  cliente.post(`${RUTA_DE_RETIROS}/${id}/liquidar`, { faltante: '0.00', ...cuerpo });

const reabrir = (id: string, cuerpo: Record<string, unknown> = { motivo: 'Faltaba un pago' }) =>
  e.propietario().post(`${RUTA_DE_RETIROS}/${id}/reabrir`, cuerpo);

const ficha = async (id: string) => (await e.propietario().get(`${RUTA_DE_RETIROS}/${id}`)).cuerpo;

/** El depósito de la devolución de un retiro, como quedó en Bancos. */
async function depositoDe(retiroId: string) {
  const [fila] = await consultar<{ id: string; tipo: string; beneficiario: string | null; monto: string }>(
    `select m.id, m.tipo, m.beneficiario, m.monto::text from bancos.movimientos m
      where m.documento_de_origen_id = $1 and m.tipo = 'credito'`,
    [retiroId],
  );
  return fila;
}

/** Un retiro con cheque y un pago vigente (sembrado) por `pagado`, si se pide. */
async function retiroConPago(monto: string, pagado?: string) {
  const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, monto));
  if (pagado) await sembrarPagoDelRetiro(retiro.id, (await e.proveedorConCargo()).cargo, { monto: pagado });
  return retiro;
}

describe('liquidar', () => {
  it('sin sobrante cierra el retiro sin depósito ni auditoría y el cheque queda como pago a proveedores', async () => {
    const retiro = await retiroConPago('500.00', '500.00');

    const liquidado = await liquidar(retiro.id, { devuelto: '0.00' });

    expect(liquidado.estado, JSON.stringify(liquidado.cuerpo)).toBe(200);
    expect(liquidado.cuerpo).toMatchObject({
      estado: 'liquidado',
      pagado: '500.00',
      disponible: '0.00',
      devuelto: '0.00',
      faltante: '0.00',
      puedeLiquidar: false,
      puedeReabrir: true,
      liquidacion: { fecha: HOY, deposito: null },
    });
    expect(await depositoDe(retiro.id)).toBeUndefined();
    expect(await auditoriaDe(retiro.id)).toEqual([]);
    expect(await conceptoDelMovimiento(retiro.movimiento.id)).toBe('pago_a_proveedor');
  });

  it('con lo que sobró hace un depósito en Bancos sin flujo y reparte el cheque entre Operación, Inversión y efectivo', async () => {
    const proveedor = await e.mundo.unProveedor();
    const gasto = await e.cargoAutorizado(proveedor);
    const activo = await e.cargoAutorizado(proveedor, '1120.00', true);
    await e.contrasena(proveedor, [gasto, activo]);
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '1000.00'));
    await sembrarPagoDelRetiro(retiro.id, gasto, { monto: '300.00' });
    await sembrarPagoDelRetiro(retiro.id, activo, { monto: '200.00' });

    const liquidado = await liquidar(retiro.id, { devuelto: '500.00', referencia: 'BOL-DEP-1' });

    expect(liquidado.estado, JSON.stringify(liquidado.cuerpo)).toBe(200);
    const deposito = await depositoDe(retiro.id);
    expect(deposito).toMatchObject({ tipo: 'credito', beneficiario: 'Juan Pérez', monto: '500.00' });
    expect(liquidado.cuerpo).toMatchObject({ devuelto: '500.00', liquidacion: { deposito: { id: deposito!.id } } });
    expect(await conceptoDelMovimiento(deposito!.id)).toBe('devolucion_de_efectivo_para_pagos');
    expect(await desgloseDe(retiro.movimiento.id)).toEqual([
      { clave: 'pago_a_proveedor_de_activo', monto: '200.00' },
      { clave: 'pago_a_proveedor', monto: '300.00' },
      { clave: 'efectivo_para_pagos', monto: '500.00' },
    ]);
    expect(Number(await saldoDe(e.propietario(), e.cuentaBancariaId))).toBe(Number(saldoAntes) - 500);
  });

  it('con faltante lo deja con su motivo, lo audita como ajuste y lo clasifica como «Faltante de efectivo»', async () => {
    const retiro = await retiroConPago('1000.00', '600.00');

    const liquidado = await liquidar(retiro.id, {
      devuelto: '300.00',
      faltante: '100.00',
      motivoDeFaltante: 'Se cayó de la bolsa',
    });

    expect(liquidado.estado, JSON.stringify(liquidado.cuerpo)).toBe(200);
    expect(liquidado.cuerpo).toMatchObject({ faltante: '100.00', motivoDeFaltante: 'Se cayó de la bolsa' });
    expect(await auditoriaDe(retiro.id)).toEqual([
      { accion: 'ajustar', motivo: 'Se cayó de la bolsa', recurso: 'cuentas-por-pagar.retiros' },
    ]);
    expect(await desgloseDe(retiro.movimiento.id)).toEqual([
      { clave: 'faltante_de_efectivo', monto: '100.00' },
      { clave: 'efectivo_para_pagos', monto: '300.00' },
      { clave: 'pago_a_proveedor', monto: '600.00' },
    ]);
  });
});

describe('lo que no se puede liquidar', () => {
  it('lo devuelto más el faltante debe ser lo que no se pagó, y un faltante lleva motivo', async () => {
    const retiro = await retiroConPago('1000.00', '600.00');
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);

    const noCuadra = await liquidar(retiro.id, { devuelto: '100.00', faltante: '100.00', motivoDeFaltante: 'Faltó' });
    const sinMotivo = await liquidar(retiro.id, { devuelto: '300.00', faltante: '100.00' });

    expect(noCuadra.cuerpo.error.codigo).toBe('liquidacion_no_cuadra');
    expect(noCuadra.cuerpo.error.mensaje).toContain('Q400.00');
    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_de_faltante_obligatorio');
    expect((await retiroEnBase(retiro.id)).estado).toBe('abierto');
    expect(await saldoDe(e.propietario(), e.cuentaBancariaId)).toBe(saldoAntes);
    expect(await depositoDe(retiro.id)).toBeUndefined();
  });

  it('la fecha no es futura ni anterior al retiro ni a su último pago', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '100.00', { fecha: haceDias(4) }));
    const { cargo } = await e.proveedorConCargo();
    await sembrarPagoDelRetiro(retiro.id, cargo, { monto: '40.00', fecha: haceDias(2) });

    for (const fecha of [haceDias(-1), haceDias(5), haceDias(3)]) {
      const respuesta = await liquidar(retiro.id, { devuelto: '60.00', fecha });
      expect(respuesta.cuerpo.error.codigo).toBe('fecha_de_liquidacion_invalida');
    }
    const buena = await liquidar(retiro.id, { devuelto: '60.00', fecha: haceDias(2) });
    expect(buena.estado, JSON.stringify(buena.cuerpo)).toBe(200);
    expect(await retiroEnBase(retiro.id)).toMatchObject({ estado: 'liquidado', fecha_de_liquidacion: haceDias(2) });
  });

  it('un retiro liquidado no se liquida otra vez ni uno anulado', async () => {
    const retiro = await retiroConPago('100.00', '100.00');
    await liquidar(retiro.id, { devuelto: '0.00' });
    const anulable = await registrarRetiro(e.propietario(), retiroConCheque(e, '50.00'));
    await e.propietario().post(`${RUTA_DE_RETIROS}/${anulable.id}/anular`, { motivo: 'Error' });

    expect((await liquidar(retiro.id, { devuelto: '0.00' })).cuerpo.error.codigo).toBe('retiro_liquidado');
    expect((await liquidar(anulable.id, { devuelto: '50.00' })).cuerpo.error.codigo).toBe('retiro_ya_anulado');
  });
});

describe('el custodio que liquida su propio retiro', () => {
  it('la ficha y la respuesta le avisan que conviene que lo liquide otra persona, sin bloquearlo', async () => {
    const custodio = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
      nombres: 'Custodio Liquida',
      apellidos: 'Retiros',
      permisos: ['cuentas-por-pagar.retiros.ver', 'cuentas-por-pagar.retiros.liquidar'],
    });
    const [usuario] = await consultar<{ id: string }>('select id from core.usuarios where nombres = $1', [
      'Custodio Liquida',
    ]);
    const retiro = await registrarRetiro(
      e.propietario(),
      retiroConCheque(e, '100.00', { custodioUsuarioId: usuario!.id }),
    );
    const aviso = 'Usted es el custodio de este retiro: conviene que lo liquide otra persona.';

    const suya = await custodio.get(`${RUTA_DE_RETIROS}/${retiro.id}`);
    const delPropietario = await ficha(retiro.id);
    const liquidado = await liquidar(retiro.id, { devuelto: '100.00' }, custodio);

    expect(suya.cuerpo.liquidaElCustodio).toBe(true);
    expect(delPropietario.liquidaElCustodio).toBe(false);
    expect(liquidado.estado, JSON.stringify(liquidado.cuerpo)).toBe(200);
    expect(liquidado.cuerpo.avisos).toContain(aviso);
  });
});

describe('reabrir', () => {
  it('con depósito lo anula, deja el retiro abierto y el cheque sin lo devuelto, y se audita', async () => {
    const retiro = await retiroConPago('1000.00', '400.00');
    await liquidar(retiro.id, { devuelto: '500.00', faltante: '100.00', motivoDeFaltante: 'Faltó' });
    const saldoLiquidado = await saldoDe(e.propietario(), e.cuentaBancariaId);

    const reabierto = await reabrir(retiro.id, { motivo: 'Se encontró el faltante' });

    expect(reabierto.estado, JSON.stringify(reabierto.cuerpo)).toBe(200);
    expect(reabierto.cuerpo).toMatchObject({
      estado: 'abierto',
      devuelto: '0.00',
      faltante: '0.00',
      motivoDeFaltante: null,
      liquidacion: null,
      disponible: '600.00',
      puedeLiquidar: true,
    });
    expect(Number(await saldoDe(e.propietario(), e.cuentaBancariaId))).toBe(Number(saldoLiquidado) - 500);
    expect(await retiroEnBase(retiro.id)).toMatchObject({ estado: 'abierto', movimiento_de_devolucion_id: null });
    expect((await auditoriaDe(retiro.id)).map(({ accion }) => accion)).toEqual(['ajustar', 'reabrir']);
    expect(await desgloseDe(retiro.movimiento.id)).toEqual([
      { clave: 'pago_a_proveedor', monto: '400.00' },
      { clave: 'efectivo_para_pagos', monto: '600.00' },
    ]);
    expect((await liquidar(retiro.id, { devuelto: '600.00' })).estado).toBe(200);
  });

  it('un retiro abierto o anulado no se reabre y pide el motivo', async () => {
    const abierto = await registrarRetiro(e.propietario(), retiroConCheque(e, '20.00'));

    expect((await reabrir(abierto.id)).cuerpo.error.codigo).toBe('retiro_no_liquidado');
    expect((await reabrir(abierto.id, { motivo: ' ' })).estado).toBeGreaterThanOrEqual(400);
  });

  it('el depósito anulado desde Bancos reabre el retiro', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '250.00'));
    await liquidar(retiro.id, { devuelto: '250.00' });
    const deposito = await depositoDe(retiro.id);

    const anulado = await e.propietario().post(`/api/bancos/notas/${deposito!.id}/anular`, {
      motivo: 'Boleta de otro banco',
    });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(await retiroEnBase(retiro.id)).toMatchObject({ estado: 'abierto', devuelto: '0.00' });
    expect(await auditoriaDe(retiro.id)).toMatchObject([{ accion: 'reabrir', motivo: 'Boleta de otro banco' }]);
    expect((await movimientoDelRetiro(retiro.movimiento.id)).tipo).toBe('cheque');
    expect((await ficha(retiro.id)).estado).toBe('abierto');
  });

  it('un depósito de un mes conciliado se anula con inverso y el retiro se reabre', async () => {
    const cuenta = await cuentaConFondos(e.propietario(), 'Cuenta de depósitos conciliados');
    const retiro = await registrarRetiro(
      e.propietario(),
      retiroConCheque(e, '300.00', { chequeraId: cuenta.chequeraId }),
    );
    await liquidar(retiro.id, { devuelto: '300.00' });
    const deposito = await depositoDe(retiro.id);
    await consultar('update bancos.movimientos set fecha = $2 where id = $1', [deposito!.id, MES_CONCILIADO]);
    await cerrarEnero(e.propietario(), autoriza, await iniciarEnero(e.propietario(), cuenta.cuentaBancariaId));

    const anulado = await e.propietario().post(`/api/bancos/notas/${deposito!.id}/anular`, {
      motivo: 'Boleta rechazada',
      fecha: HOY,
    });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(await retiroEnBase(retiro.id)).toMatchObject({ estado: 'abierto', devuelto: '0.00' });
    expect(await auditoriaDe(retiro.id)).toMatchObject([{ accion: 'reabrir', motivo: 'Boleta rechazada' }]);
  });

  it('si Bancos rechaza el inverso en el mes conciliado, el retiro sigue liquidado', async () => {
    const cuenta = await cuentaConFondos(e.propietario(), 'Cuenta de depósitos bloqueados');
    const retiro = await registrarRetiro(
      e.propietario(),
      retiroConCheque(e, '300.00', { chequeraId: cuenta.chequeraId }),
    );
    await liquidar(retiro.id, { devuelto: '300.00' });
    const deposito = await depositoDe(retiro.id);
    await consultar('update bancos.movimientos set fecha = $2 where id = $1', [deposito!.id, MES_CONCILIADO]);
    await cerrarEnero(e.propietario(), autoriza, await iniciarEnero(e.propietario(), cuenta.cuentaBancariaId));

    const anulado = await e.propietario().post(`/api/bancos/notas/${deposito!.id}/anular`, {
      motivo: 'Boleta rechazada',
      fecha: MES_CONCILIADO,
    });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBeGreaterThanOrEqual(400);
    expect(await retiroEnBase(retiro.id)).toMatchObject({ estado: 'liquidado', devuelto: '300.00' });
    expect((await auditoriaDe(retiro.id)).map(({ accion }) => accion)).not.toContain('reabrir');
  });
});
