/**
 * Los avisos de Bancos sobre los movimientos de un fondo (CC-2, §5.9 del diseño): anular desde Bancos la apertura o un
 * aumento (se anula el cambio y, si era la apertura, el fondo), lo que se rechaza (fondo usado, disminución, eliminar, un
 * usuario sin el fondo asignado) y que el aviso sea idempotente.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import {
  cambiosEnBase,
  EscenarioDeCajaChica,
  fondoEnBase,
  movimientoDeBancos,
  RUTA_DE_FONDOS,
  sembrarVale,
} from './soporte/caja-chica-fondos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { saldoDe } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDeCajaChica;
let soloBancos: ClienteApi;

beforeAll(async () => {
  e = await EscenarioDeCajaChica.preparar(entorno, 'cajachicaavisos');
  soloBancos = await crearUsuarioConPermisos(entorno, e.cuenta, {
    nombres: 'Solo',
    apellidos: 'Bancos',
    permisos: ['bancos.cheques.ver', 'bancos.cheques.anular', 'bancos.notas.ver', 'bancos.notas.anular'],
  });
});

const anularElCheque = async (cambio: { movimiento_id: string | null }, cliente: ClienteApi = e.propietario()) => {
  const { cheque_id } = await movimientoDeBancos(cambio.movimiento_id!);
  return cliente.post(`/api/bancos/cheques/${cheque_id}/anular`, { motivo: 'Desde Bancos' });
};

describe('anular desde Bancos', () => {
  it('el cheque de la apertura de un fondo sin uso: el cambio se anula, el fondo se cierra y se audita «anular»', async () => {
    const saldoAntes = await saldoDe(e.propietario(), e.cuentaBancariaId);
    const fondo = await e.abrir(e.conCheque('Caja anulada en Bancos', { monto: '400.00' }));
    const [apertura] = await cambiosEnBase(fondo.id);

    const anulado = await anularElCheque(apertura!);

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect(await fondoEnBase(fondo.id)).toMatchObject({ estado: 'cerrado', motivo_de_cierre: 'Desde Bancos' });
    expect((await cambiosEnBase(fondo.id))[0]).toMatchObject({ estado: 'anulado' });
    expect(await saldoDe(e.propietario(), e.cuentaBancariaId)).toBe(saldoAntes);
    expect(await auditoriaDe(fondo.id)).toEqual([
      { accion: 'anular', motivo: 'Desde Bancos', recurso: 'caja-chica.fondos' },
    ]);
    expect((await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}`)).cuerpo.aperturaAnulada).toBe(true);
  });

  it('el cheque de un aumento: el cambio se anula y el fondo sigue abierto con su monto de antes', async () => {
    const fondo = await e.abrir(e.conCheque('Caja con aumento anulado', { monto: '400.00' }));
    await e.propietario().post(`${RUTA_DE_FONDOS}/${fondo.id}/aumentar`, {
      forma: 'cheque',
      chequeraId: e.chequeraId,
      monto: '100.00',
    });
    const [, aumento] = await cambiosEnBase(fondo.id);

    const anulado = await anularElCheque(aumento!);

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    expect((await cambiosEnBase(fondo.id)).map((c) => c.estado)).toEqual(['vigente', 'anulado']);
    expect((await e.propietario().get(`${RUTA_DE_FONDOS}/${fondo.id}`)).cuerpo).toMatchObject({
      estado: 'abierto',
      monto: '400.00',
    });
  });
});

describe('lo que se rechaza', () => {
  it('con el fondo usado el cheque sigue emitido y el fondo abierto', async () => {
    const fondo = await e.abrir(e.conCheque('Caja usada', { monto: '400.00' }));
    await sembrarVale(fondo.id, e.cuenta.empresaId, '50.00');
    const [apertura] = await cambiosEnBase(fondo.id);

    const anulado = await anularElCheque(apertura!);

    expect(anulado.estado).toBe(422);
    expect(anulado.cuerpo.error.codigo).toBe('fondo_con_movimientos');
    expect((await cambiosEnBase(fondo.id))[0]).toMatchObject({ estado: 'vigente' });
    expect((await fondoEnBase(fondo.id)).estado).toBe('abierto');
  });

  it('el depósito de una disminución se corrige desde Caja chica, no desde Bancos', async () => {
    const fondo = await e.abrir(e.conCheque('Caja con depósito', { monto: '400.00' }));
    await e.propietario().post(`${RUTA_DE_FONDOS}/${fondo.id}/disminuir`, { monto: '100.00' });
    const [, disminucion] = await cambiosEnBase(fondo.id);

    const anulado = await e
      .propietario()
      .post(`/api/bancos/notas/${disminucion!.movimiento_id}/anular`, { motivo: 'Desde Bancos' });
    const eliminado = await e.propietario().delete(`/api/bancos/notas/${disminucion!.movimiento_id}`);

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(422);
    expect(anulado.cuerpo.error.codigo).toBe('movimiento_de_caja_chica');
    expect(eliminado.estado).toBeGreaterThanOrEqual(400);
    expect((await cambiosEnBase(fondo.id))[1]).toMatchObject({ estado: 'vigente' });
  });

  it('un usuario de Bancos que no tiene el fondo asignado no puede anular su cheque', async () => {
    const fondo = await e.abrir(e.conCheque('Caja ajena', { monto: '400.00' }));
    const [apertura] = await cambiosEnBase(fondo.id);

    const anulado = await anularElCheque(apertura!, soloBancos);

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(422);
    expect(anulado.cuerpo.error.codigo).toBe('movimiento_de_caja_chica');
    expect((await fondoEnBase(fondo.id)).estado).toBe('abierto');
  });

  it('anular dos veces desde Bancos no repite nada: el segundo intento lo rechaza Bancos y el fondo sigue cerrado', async () => {
    const fondo = await e.abrir(e.conCheque('Caja doble', { monto: '400.00' }));
    const [apertura] = await cambiosEnBase(fondo.id);
    await anularElCheque(apertura!);

    const otra = await anularElCheque(apertura!);

    expect(otra.estado).toBeGreaterThanOrEqual(400);
    expect(await auditoriaDe(fondo.id)).toHaveLength(1);
  });
});
