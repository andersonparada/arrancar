/**
 * Correcciones de BS-2: un saldo del estado de cuenta de cero es válido y un cheque de la carga inicial no se blanquea.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { agregarPartida, empresaConInicio, fichaDe, guardarSaldo, partida } from './soporte/apertura-por-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import type { CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
const usuario = () => cuenta.propietario;

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Correcciones de saldos', usuario: 'propietariocorrecciones' });
});

const movimientosDeSaldo = (cuentaId: string) =>
  comoPropietario<{ monto: string }>(
    `select monto from bancos.movimientos where cuenta_bancaria_id = $1 and parte_de_apertura = 'saldo_del_banco'`,
    [cuentaId],
  );

describe('saldo del estado de cuenta en cero', () => {
  it('se guarda sin movimiento, permite cargar las partidas y el cuadre lo muestra en cero', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());

    const guardado = await guardarSaldo(usuario(), cuentaId, '0.00');
    const deposito = await agregarPartida(usuario(), cuentaId, partida('deposito_en_transito', { monto: '500.00' }));

    expect(guardado.estado).toBe(200);
    expect(deposito.estado).toBe(201);
    expect(await movimientosDeSaldo(cuentaId)).toEqual([]);
    const ficha = await fichaDe(usuario(), cuentaId);
    expect(ficha).toMatchObject({
      forma: 'con_partidas',
      saldoSegunEstadoDeCuenta: '0.00',
      saldoEnLibrosAlCorte: '500.00',
    });
  });

  it('se corrige a cero (el movimiento se borra) y de cero a otro valor (se crea)', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());
    await guardarSaldo(usuario(), cuentaId, '800.00');

    expect((await guardarSaldo(usuario(), cuentaId, '0.00')).estado).toBe(200);
    expect(await movimientosDeSaldo(cuentaId)).toEqual([]);
    expect(await fichaDe(usuario(), cuentaId)).toMatchObject({ saldoSegunEstadoDeCuenta: '0.00' });

    expect((await guardarSaldo(usuario(), cuentaId, '-120.00')).estado).toBe(200);
    expect(await fichaDe(usuario(), cuentaId)).toMatchObject({
      saldoSegunEstadoDeCuenta: '-120.00',
      saldoEnLibrosAlCorte: '-120.00',
    });
  });
});

describe('anular un cheque de la carga inicial', () => {
  it('con el mes abierto crea su inverso (nunca a la antigua): el saldo en libros al corte no cambia', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());
    await guardarSaldo(usuario(), cuentaId, '1000.00');
    const cheque = await agregarPartida(usuario(), cuentaId, partida('cheque_en_circulacion', { numeroDeCheque: 41 }));
    expect(cheque.estado, JSON.stringify(cheque.cuerpo)).toBe(201);
    const movimientoId = cheque.cuerpo.partida.movimientoId as string;
    const [fila] = await comoPropietario<{ id: string }>(
      `select c.id from bancos.cheques c where c.movimiento_id = $1`,
      [movimientoId],
    );

    const anulado = await usuario().post(`/api/bancos/cheques/${fila!.id}/anular`, { motivo: 'no se cobró' });

    expect(anulado.estado).toBe(200);
    const [original] = await comoPropietario<{ anulado_en: string | null; revertido_en: string | null }>(
      'select anulado_en, revertido_en from bancos.movimientos where id = $1',
      [movimientoId],
    );
    expect(original!.anulado_en).toBeNull();
    expect(original!.revertido_en).not.toBeNull();
    const inversos = await comoPropietario('select id from bancos.movimientos where revierte_a_id = $1', [
      movimientoId,
    ]);
    expect(inversos).toHaveLength(1);
    expect((await fichaDe(usuario(), cuentaId)).saldoEnLibrosAlCorte).toBe('900.00');
  });
});

describe('un cheque de la carga inicial no se blanquea', () => {
  it('con la carga abierta o cerrada se rechaza (422) y la partida sigue en su lugar', async () => {
    const cuentaId = await crearCuentaSinSaldo(usuario());
    await guardarSaldo(usuario(), cuentaId, '1000.00');
    const cheque = await agregarPartida(usuario(), cuentaId, partida('cheque_en_circulacion', { numeroDeCheque: 40 }));
    const [fila] = await comoPropietario<{ id: string }>(
      `select c.id from bancos.cheques c where c.movimiento_id = $1`,
      [cheque.cuerpo.partida.movimientoId],
    );

    const abierta = await usuario().post(`/api/bancos/cheques/${fila!.id}/blanquear`, { motivo: 'error' });
    await usuario().post(`/api/empresas/${cuenta.empresaId}/carga-inicial/cerrar`, {});
    const cerrada = await usuario().post(`/api/bancos/cheques/${fila!.id}/blanquear`, { motivo: 'error' });

    for (const intento of [abierta, cerrada]) {
      expect(intento.estado).toBe(422);
      expect(intento.cuerpo.error.codigo).toBe('no_se_blanquea_un_cheque_de_apertura');
    }
    const ficha = await fichaDe(usuario(), cuentaId);
    expect(ficha.saldoEnLibrosAlCorte).toBe('900.00');
    expect(ficha.partidas).toHaveLength(2);
  });
});
