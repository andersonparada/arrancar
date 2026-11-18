/**
 * BS-2: los cheques de la apertura y sus chequeras, convertir el saldo global de antes, la carga cerrada y los permisos.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  agregarPartida,
  empresaConInicio,
  fichaDe,
  guardarSaldo,
  partida,
  RUTA_DE_APERTURA,
} from './soporte/apertura-por-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';
import { crearUsuarioConPermisos, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
const usuario = () => cuenta.propietario;
const nuevaCuenta = () => crearCuentaSinSaldo(usuario());

/** Una cuenta con su saldo según el estado de cuenta ya cargado. */
async function cuentaConSaldo(saldo = '1000.00'): Promise<string> {
  const id = await nuevaCuenta();
  expect((await guardarSaldo(usuario(), id, saldo)).estado).toBe(200);
  return id;
}

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Cheques apertura', usuario: 'propietariochequesapertura' });
});

describe('cheques de la apertura y sus chequeras', () => {
  const chequeDe = (cuentaId: string, numero: number) =>
    comoPropietario<{
      estado: string;
      movimiento_id: string | null;
      de_apertura: boolean;
      activa: boolean;
      desde: number;
      hasta: number;
    }>(
      `select c.estado, c.movimiento_id, q.de_apertura, q.activa, q.desde, q.hasta
         from bancos.cheques c join bancos.chequeras q on q.id = c.chequera_id
        where q.cuenta_bancaria_id = $1 and c.numero = $2`,
      [cuentaId, numero],
    );

  it('un número disponible de una chequera registrada se usa (y queda emitido); uno emitido se rechaza (400, campo numeroDeCheque)', async () => {
    const cuentaId = await cuentaConSaldo();
    const chequera = await usuario().post(`/api/bancos/cuentas-bancarias/${cuentaId}/chequeras`, {
      serie: null,
      desde: 1,
      hasta: 50,
    });
    expect(chequera.estado).toBe(201);

    const primera = await agregarPartida(usuario(), cuentaId, partida('cheque_en_circulacion', { numeroDeCheque: 7 }));
    const repetida = await agregarPartida(usuario(), cuentaId, partida('cheque_en_circulacion', { numeroDeCheque: 7 }));

    expect(primera.estado).toBe(201);
    expect(await chequeDe(cuentaId, 7)).toEqual([
      {
        estado: 'emitido',
        movimiento_id: primera.cuerpo.partida.movimientoId,
        de_apertura: false,
        activa: true,
        desde: 1,
        hasta: 50,
      },
    ]);
    expect(repetida.estado).toBe(400);
    expect(repetida.cuerpo.error.codigo).toBe('cheque_de_apertura_ya_usado');
  });

  it('un número sin chequera registrada crea la de apertura, inactiva, con su rango al día; al eliminar se borra', async () => {
    const cuentaId = await cuentaConSaldo();

    const primera = await agregarPartida(
      usuario(),
      cuentaId,
      partida('cheque_en_circulacion', { numeroDeCheque: 99, serie: 'A' }),
    );
    const segunda = await agregarPartida(
      usuario(),
      cuentaId,
      partida('cheque_en_circulacion', { numeroDeCheque: 120, serie: 'A' }),
    );

    expect(await chequeDe(cuentaId, 99)).toMatchObject([{ de_apertura: true, activa: false, desde: 99, hasta: 120 }]);
    const baja = await usuario().delete(
      `${RUTA_DE_APERTURA}/${cuentaId}/partidas/${primera.cuerpo.partida.movimientoId}`,
      { motivo: 'Error' },
    );
    expect(baja.estado).toBe(204);
    expect(await chequeDe(cuentaId, 99)).toEqual([]);
    expect(await chequeDe(cuentaId, 120)).toMatchObject([{ desde: 120, hasta: 120 }]);
    await usuario().delete(`${RUTA_DE_APERTURA}/${cuentaId}/partidas/${segunda.cuerpo.partida.movimientoId}`, {
      motivo: 'Error',
    });
    expect(await chequeDe(cuentaId, 120)).toEqual([]);
  });

  it('una chequera nueva que incluye un número de la carga inicial se rechaza (422); empezar después, no', async () => {
    const cuentaId = await cuentaConSaldo();
    await agregarPartida(usuario(), cuentaId, partida('cheque_en_circulacion', { numeroDeCheque: 300 }));
    const ruta = `/api/bancos/cuentas-bancarias/${cuentaId}/chequeras`;

    const traslapada = await usuario().post(ruta, { serie: null, desde: 250, hasta: 350 });
    const despues = await usuario().post(ruta, { serie: null, desde: 301, hasta: 400 });
    const otraSerie = await usuario().post(ruta, { serie: 'B', desde: 250, hasta: 350 });

    expect(traslapada.estado).toBe(422);
    expect(traslapada.cuerpo.error.codigo).toBe('rango_de_cheques_traslapado');
    expect(traslapada.cuerpo.error.mensaje).toContain('el cheque 300 es de la carga inicial');
    expect([despues.estado, otraSerie.estado]).toEqual([201, 201]);
  });
});

describe('convertir el saldo global de antes', () => {
  it('pasa a saldo del banco al corte, con auditoría; con movimientos anteriores se rechaza (422)', async () => {
    const convertible = await nuevaCuenta();
    const bloqueada = await nuevaCuenta();
    for (const id of [convertible, bloqueada]) {
      const global = await usuario().post(RUTA_DE_APERTURA, {
        cuentaBancariaId: id,
        tipo: 'credito',
        fecha: '2025-10-01',
        monto: '800.00',
        referencia: null,
        observaciones: null,
      });
      expect(global.estado).toBe(201);
    }
    await usuario().post('/api/bancos/notas', {
      cuentaBancariaId: bloqueada,
      tipo: 'credito',
      fecha: '2025-12-15',
      monto: '5.00',
      referencia: null,
      observaciones: null,
      conceptoId: await conceptoGeneral(usuario()),
    });
    expect((await fichaDe(usuario(), convertible)).forma).toBe('global');

    const rechazada = await guardarSaldo(usuario(), bloqueada, '800.00');
    const convertida = await guardarSaldo(usuario(), convertible, '900.00');

    expect(rechazada.cuerpo.error.codigo).toBe('cuenta_con_movimientos_anteriores');
    expect(convertida.estado).toBe(200);
    expect(convertida.cuerpo.saldoInicial).toMatchObject({ forma: 'con_partidas', saldoSegunEstadoDeCuenta: '900.00' });
    expect(convertida.cuerpo.saldoInicial.partidas[0]).toMatchObject({ parte: 'saldo_del_banco', fecha: '2025-12-31' });
    const [corregir] = await comoPropietario<{ accion: string; anterior: { forma: string } }>(
      `select accion, anterior from core.auditoria where recurso = 'bancos.saldos-iniciales' and accion = 'corregir' and cuenta_id = $1`,
      [cuenta.cuentaId],
    );
    expect(corregir).toMatchObject({ anterior: { forma: 'global' } });
  });
});

describe('carga inicial cerrada', () => {
  it('todo se rechaza (422), también el posfechado, mientras no la reabran', async () => {
    const cerrada = await empresaConInicio(entorno, { nombre: 'Carga cerrada', usuario: 'propietariocargacerrada' });
    const cuentaId = await crearCuentaSinSaldo(cerrada.propietario);
    await guardarSaldo(cerrada.propietario, cuentaId, '500.00');
    const concepto = await conceptoGeneral(cerrada.propietario);
    const deposito = await agregarPartida(cerrada.propietario, cuentaId, partida('deposito_en_transito'));
    expect((await cerrada.propietario.post(`/api/empresas/${cerrada.empresaId}/carga-inicial/cerrar`, {})).estado).toBe(
      200,
    );

    const intentos = [
      await guardarSaldo(cerrada.propietario, cuentaId, '600.00'),
      await agregarPartida(cerrada.propietario, cuentaId, partida('deposito_en_transito')),
      await agregarPartida(cerrada.propietario, cuentaId, partida('cheque_posfechado', { conceptoId: concepto })),
      await cerrada.propietario.put(
        `${RUTA_DE_APERTURA}/${cuentaId}/partidas/${deposito.cuerpo.partida.movimientoId}`,
        { fecha: '2025-12-20', monto: '1.00' },
      ),
      await cerrada.propietario.delete(
        `${RUTA_DE_APERTURA}/${cuentaId}/partidas/${deposito.cuerpo.partida.movimientoId}`,
        { motivo: 'x' },
      ),
      await cerrada.propietario.delete(`${RUTA_DE_APERTURA}/${cuentaId}`, { motivo: 'x' }),
    ];

    for (const intento of intentos) {
      expect(intento.estado, JSON.stringify(intento.cuerpo)).toBe(422);
      expect(intento.cuerpo.error.codigo).toBe('carga_inicial_cerrada');
    }
    const ficha = await fichaDe(cerrada.propietario, cuentaId);
    expect(ficha.cargaCerrada ?? ficha.puedeEditar).toBe(false);
    expect(ficha.partidas.every((p: { puedeCorregir: boolean }) => !p.puedeCorregir)).toBe(true);
  });
});

describe('permisos', () => {
  it('ver, crear, editar y eliminar son permisos distintos (403 sin el que toca)', async () => {
    const cuentaId = await nuevaCuenta();
    const con = (nombres: string, accion: string) =>
      crearUsuarioConPermisos(entorno, cuenta, {
        nombres,
        apellidos: 'Apertura',
        permisos: [`bancos.saldos-iniciales.${accion}`],
      });
    const [soloVer, soloCrear, soloEditar, soloEliminar] = [
      await con('Solo ver', 'ver'),
      await con('Solo crear', 'crear'),
      await con('Solo editar', 'editar'),
      await con('Solo eliminar', 'eliminar'),
    ];

    expect((await soloVer.get(RUTA_DE_APERTURA)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_DE_APERTURA}/${cuentaId}`)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_DE_APERTURA}/revision-de-cierre`)).estado).toBe(200);
    expect((await soloEliminar.get(RUTA_DE_APERTURA)).estado).toBe(403);
    expect((await soloVer.put(`${RUTA_DE_APERTURA}/${cuentaId}`, { saldoSegunEstadoDeCuenta: '1.00' })).estado).toBe(
      403,
    );
    expect((await soloEditar.put(`${RUTA_DE_APERTURA}/${cuentaId}`, { saldoSegunEstadoDeCuenta: '1.00' })).estado).toBe(
      403,
    );
    expect((await soloCrear.put(`${RUTA_DE_APERTURA}/${cuentaId}`, { saldoSegunEstadoDeCuenta: '1.00' })).estado).toBe(
      200,
    );
    expect((await soloCrear.put(`${RUTA_DE_APERTURA}/${cuentaId}`, { saldoSegunEstadoDeCuenta: '2.00' })).estado).toBe(
      403,
    );
    expect((await soloEditar.put(`${RUTA_DE_APERTURA}/${cuentaId}`, { saldoSegunEstadoDeCuenta: '2.00' })).estado).toBe(
      200,
    );
    expect(
      (await soloEditar.post(`${RUTA_DE_APERTURA}/${cuentaId}/partidas`, partida('deposito_en_transito'))).estado,
    ).toBe(403);
    expect(
      (await soloCrear.post(`${RUTA_DE_APERTURA}/${cuentaId}/partidas`, partida('deposito_en_transito'))).estado,
    ).toBe(201);
    expect((await soloCrear.delete(`${RUTA_DE_APERTURA}/${cuentaId}`, { motivo: 'x' })).estado).toBe(403);
    expect((await soloEliminar.delete(`${RUTA_DE_APERTURA}/${cuentaId}`, { motivo: 'x' })).estado).toBe(204);
  });
});
