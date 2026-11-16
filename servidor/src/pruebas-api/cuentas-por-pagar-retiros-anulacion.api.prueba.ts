/**
 * Anular un retiro de efectivo (CP4-E2), desde Cuentas por pagar y desde Bancos: la fecha contable de la anulación sin y
 * con inverso, lo que se rechaza (pagos vigentes, cheque cobrado, retiro liquidado o ya anulado), lo que Bancos no puede
 * corregir ni eliminar, el aviso idempotente y Cuentas por pagar inactivo.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { mediador } from '../modulos/core/mediador/contexto.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  cerrarEnero,
  cuentaConFondos,
  iniciarEnero,
  MES_CONCILIADO,
} from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import {
  chequeDelRetiro,
  conceptoDelMovimiento,
  moverFechaDelRetiro,
  movimientoDelRetiro,
  registrarRetiro,
  retiroConCheque,
  retiroConNota,
  retiroEnBase,
  RUTA_DE_RETIROS,
  sembrarPagoDelRetiro,
} from './soporte/cuentas-por-pagar-retiros.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe, operadorDeLaCuenta } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let autoriza: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpretirosanu');
  autoriza = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Retiros',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
});

const anular = (id: string, cuerpo: Record<string, unknown> = { motivo: 'Se sacó por error' }) =>
  e.propietario().post(`${RUTA_DE_RETIROS}/${id}/anular`, cuerpo);

const anularElCheque = async (retiroId: string, cuerpo: Record<string, unknown> = { motivo: 'Desde Bancos' }) =>
  e.propietario().post(`/api/bancos/cheques/${await chequeDelRetiro(retiroId)}/anular`, cuerpo);

describe('anular desde Cuentas por pagar', () => {
  it('un retiro con cheque, sin inverso: queda anulado con la fecha del retiro, devuelve el saldo y se audita', async () => {
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '100.00', { fecha: haceDias(5) }));

    const anulado = await anular(retiro.id, { motivo: 'Se sacó por error' });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(anulado.cuerpo).toMatchObject({
      estado: 'anulado',
      anulacion: { fecha: haceDias(5), motivo: 'Se sacó por error' },
      disponible: '0.00',
      puedeAnular: false,
      puedeLiquidar: false,
    });
    expect(await retiroEnBase(retiro.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: haceDias(5) });
    expect(await saldoDe(e.propietario(), e.cuentaBancariaId)).toBe(saldoAntes);
    expect(await auditoriaDe(retiro.id)).toEqual([
      { accion: 'anular', motivo: 'Se sacó por error', recurso: 'cuentas-por-pagar.retiros' },
    ]);
  });

  it('un retiro con nota de débito se anula con inverso y su fecha contable es la del inverso', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConNota(e, '100.00', { fecha: haceDias(5) }));

    const anulado = await anular(retiro.id, { motivo: 'Boleta equivocada', fecha: HOY });

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect((await movimientoDelRetiro(retiro.movimiento.id)).inverso_fecha).toBe(HOY);
    expect(await retiroEnBase(retiro.id)).toMatchObject({
      estado: 'anulado',
      fecha: haceDias(5),
      fecha_de_anulacion: HOY,
    });
  });

  it('pide el motivo', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '10.00'));

    const respuesta = await anular(retiro.id, { motivo: '   ' });

    expect(respuesta.estado).toBeGreaterThanOrEqual(400);
    expect((await retiroEnBase(retiro.id)).estado).toBe('abierto');
  });

  it('un retiro ya anulado no se anula otra vez', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '10.00'));
    await anular(retiro.id);

    const otra = await anular(retiro.id);

    expect(otra.cuerpo.error.codigo).toBe('retiro_ya_anulado');
  });
});

describe('lo que impide anular', () => {
  it('con pagos vigentes se rechaza aquí y en Bancos, y el cheque sigue emitido', async () => {
    const { cargo } = await e.proveedorConCargo();
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '1000.00'));
    await sembrarPagoDelRetiro(retiro.id, cargo, { monto: '400.00' });

    const desdeAqui = await anular(retiro.id);
    const desdeBancos = await anularElCheque(retiro.id);

    for (const respuesta of [desdeAqui, desdeBancos]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('retiro_con_pagos');
    }
    expect((await retiroEnBase(retiro.id)).estado).toBe('abierto');
    const [cheque] = await consultar<{ estado: string }>('select estado from bancos.cheques where id = $1', [
      await chequeDelRetiro(retiro.id),
    ]);
    expect(cheque!.estado).toBe('emitido');
  });

  it('liquidado se rechaza aquí y en Bancos', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '100.00'));
    const liquidado = await e.propietario().post(`${RUTA_DE_RETIROS}/${retiro.id}/liquidar`, {
      devuelto: '100.00',
      faltante: '0.00',
    });
    expect(liquidado.estado, JSON.stringify(liquidado.cuerpo)).toBe(200);

    for (const respuesta of [await anular(retiro.id), await anularElCheque(retiro.id)]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('retiro_liquidado');
    }
  });

  it('con el cheque ya conciliado (cobrado) se rechaza aquí y en Bancos', async () => {
    const cuenta = await cuentaConFondos(e.propietario(), 'Cuenta de retiros cobrados');
    const retiro = await registrarRetiro(
      e.propietario(),
      retiroConCheque(e, '500.00', { chequeraId: cuenta.chequeraId }),
    );
    await moverFechaDelRetiro(retiro.id, MES_CONCILIADO);
    await iniciarEnero(e.propietario(), cuenta.cuentaBancariaId, [retiro.movimiento.id]);

    for (const respuesta of [await anular(retiro.id), await anularElCheque(retiro.id)]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('retiro_cobrado');
    }
    expect((await retiroEnBase(retiro.id)).estado).toBe('abierto');
  });
});

describe('anular el cheque desde Bancos', () => {
  it('en un mes abierto anula el retiro sin inverso y su fecha contable es la del retiro', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '120.00', { fecha: haceDias(4) }));

    const respuesta = await anularElCheque(retiro.id, { motivo: 'Se perdió' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await retiroEnBase(retiro.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: haceDias(4) });
    expect(await auditoriaDe(retiro.id)).toMatchObject([{ accion: 'anular', motivo: 'Se perdió' }]);
  });

  it('en un mes conciliado anula con inverso y la fecha contable es la del inverso', async () => {
    const cuenta = await cuentaConFondos(e.propietario(), 'Cuenta de retiros con inverso');
    const retiro = await registrarRetiro(
      e.propietario(),
      retiroConCheque(e, '300.00', { chequeraId: cuenta.chequeraId }),
    );
    await moverFechaDelRetiro(retiro.id, MES_CONCILIADO);
    await cerrarEnero(e.propietario(), autoriza, await iniciarEnero(e.propietario(), cuenta.cuentaBancariaId));

    const respuesta = await anularElCheque(retiro.id, { motivo: 'Caducó', fecha: HOY });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect((await movimientoDelRetiro(retiro.movimiento.id)).inverso_fecha).toBe(HOY);
    expect(await retiroEnBase(retiro.id)).toMatchObject({
      estado: 'anulado',
      fecha: MES_CONCILIADO,
      fecha_de_anulacion: HOY,
    });
  });

  it('la nota de débito del retiro anulada en Bancos anula el retiro con la fecha del inverso', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConNota(e, '90.00', { fecha: haceDias(3) }));

    const respuesta = await e.propietario().post(`/api/bancos/notas/${retiro.movimiento.id}/anular`, {
      motivo: 'Nota duplicada',
      fecha: HOY,
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(await retiroEnBase(retiro.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: HOY });
  });
});

describe('lo que Bancos no puede hacer con el movimiento de un retiro', () => {
  it('no elimina ni corrige la nota ni blanquea el cheque, y el aviso rechaza con el error del módulo', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConNota(e, '70.00'));
    const ruta = `/api/bancos/notas/${retiro.movimiento.id}`;

    const eliminar = await e.propietario().delete(ruta, { motivo: 'Intento' });
    const corregir = await e.propietario().put(ruta, { monto: '80.00' });

    for (const respuesta of [eliminar, corregir]) expect(respuesta.estado).toBeGreaterThanOrEqual(400);
    const operador = await operadorDeLaCuenta(e.mundo.escenario.cuenta);
    for (const cambio of ['eliminar', 'blanquear', 'corregir', 'reclasificar'] as const) {
      await expect(
        mediador.avisar(operador, 'bancos.movimiento_por_cambiar', aviso(retiro, cambio)),
      ).rejects.toMatchObject({ codigo: 'movimiento_de_cuentas_por_pagar' });
    }
    expect((await retiroEnBase(retiro.id)).estado).toBe('abierto');
  });

  it('el aviso de anular es idempotente y un movimiento que no es de un retiro no le importa', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConNota(e, '60.00', { fecha: haceDias(2) }));
    const operador = await operadorDeLaCuenta(e.mundo.escenario.cuenta);

    await mediador.avisar(operador, 'bancos.movimiento_por_cambiar', aviso(retiro, 'anular'));
    await mediador.avisar(operador, 'bancos.movimiento_por_cambiar', aviso(retiro, 'anular'));
    await mediador.avisar(operador, 'bancos.movimiento_por_cambiar', {
      ...aviso(retiro, 'eliminar'),
      movimientoId: crypto.randomUUID(),
    });

    expect(await retiroEnBase(retiro.id)).toMatchObject({ estado: 'anulado', fecha_de_anulacion: haceDias(2) });
    expect(await auditoriaDe(retiro.id)).toHaveLength(1);
    expect(await conceptoDelMovimiento(retiro.movimiento.id)).toBe('efectivo_para_pagos');
  });
});

describe('con Cuentas por pagar desactivado', () => {
  it('Bancos no anula el cheque del retiro y pide activar el módulo', async () => {
    const retiro = await registrarRetiro(e.propietario(), retiroConCheque(e, '40.00'));
    const url = `/api/plataforma/cuentas/${e.mundo.escenario.cuenta.cuentaId}/modulos/cuentas-por-pagar`;
    await entorno.soporte.delete(url);
    try {
      const respuesta = await anularElCheque(retiro.id);

      expect(respuesta.estado).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('modulo_de_origen_inactivo');
      expect((await retiroEnBase(retiro.id)).estado).toBe('abierto');
    } finally {
      await entorno.soporte.put(url);
    }
  });
});

/** El aviso de Bancos antes de cambiar el movimiento del retiro. */
function aviso(
  retiro: { id: string; movimiento: { id: string } },
  cambio: 'eliminar' | 'blanquear' | 'corregir' | 'reclasificar' | 'anular',
) {
  return {
    movimientoId: retiro.movimiento.id,
    moduloDeOrigen: 'cuentas-por-pagar',
    documentoDeOrigenId: retiro.id,
    cambio,
    formaDeAnulacion: cambio === 'anular' ? ('sin_inverso' as const) : null,
    motivo: 'Prueba',
    fecha: null,
  };
}
