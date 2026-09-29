import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { conceptoGeneral, crearCuentaBancaria, inversosDe, saldoDe } from './soporte/escenarios-de-bancos.js';

const RUTA_MOVIMIENTOS = '/api/bancos/movimientos';
const RUTA_CHEQUES = '/api/bancos/cheques';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let autoriza: ClienteApi;
let conceptoId = '';

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Anulaciones de cheques',
    usuario: 'propietariocheqanul',
    modulos: ['bancos'],
  });
  autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Cheques',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
  conceptoId = await conceptoGeneral(cuenta.propietario);
});

describe('cheques: anular en mes abierto o conciliado, y blanquear, por API', () => {
  let cuentaBancariaId: string;

  async function emitir(fecha: string, monto = '100.00') {
    const siguiente = await cuenta.propietario.get(
      `/api/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`,
    );
    const emitido = await cuenta.propietario.post(`${RUTA_CHEQUES}/${siguiente.cuerpo.id}/emitir`, {
      fecha,
      monto,
      beneficiario: 'Proveedor',
      noNegociable: true,
      conceptoId,
      referencia: null,
      observaciones: null,
    });
    return { chequeId: siguiente.cuerpo.id as string, movimientoId: emitido.cuerpo.id as string };
  }

  /** Concilia y autoriza enero de 2026 sin marcar nada: todo lo emitido queda en circulación. */
  async function conciliarEnero(): Promise<void> {
    const iniciada = await cuenta.propietario.post('/api/bancos/conciliaciones', {
      cuentaBancariaId,
      anio: 2026,
      mes: 1,
    });
    const ruta = `/api/bancos/conciliaciones/${iniciada.cuerpo.id}`;
    await cuenta.propietario.post(`${ruta}/terminar`, {});
    expect((await autoriza.post(`${ruta}/autorizar`, {})).estado).toBe(200);
  }

  beforeAll(async () => {
    cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Cuenta de cheques anulados');
    await cuenta.propietario.post(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`, {
      serie: null,
      desde: 1,
      hasta: 20,
    });
  });

  it('en un mes abierto se anula el cheque y su movimiento, sin nota inversa y fuera del saldo', async () => {
    const { chequeId, movimientoId } = await emitir('2026-02-02', '50.00');
    expect(await saldoDe(cuenta.propietario, cuentaBancariaId)).toBe('950.00');

    const anulado = await cuenta.propietario.post(`${RUTA_CHEQUES}/${chequeId}/anular`, { motivo: 'Se perdió' });

    expect(anulado.cuerpo).toMatchObject({ estado: 'anulado', puedeAnular: false, puedeBlanquear: false });
    const movimiento = await cuenta.propietario.get(`${RUTA_MOVIMIENTOS}/${movimientoId}`);
    expect(movimiento.cuerpo.anuladoEn).toEqual(expect.any(String));
    expect(movimiento.cuerpo.revertidoEn).toBeNull();
    expect(await inversosDe(cuenta.propietario, cuentaBancariaId)).toHaveLength(0);
    expect(await saldoDe(cuenta.propietario, cuentaBancariaId)).toBe('1000.00');
  });

  it('se blanquea: vuelve a disponible, su movimiento se elimina y su número se reutiliza', async () => {
    const { chequeId, movimientoId } = await emitir('2026-02-04', '75.00');
    const listado = (await cuenta.propietario.get(RUTA_CHEQUES)).cuerpo.find((c: { id: string }) => c.id === chequeId);
    expect(listado).toMatchObject({ puedeAnular: true, puedeBlanquear: true });
    const numero = listado.numero;

    const blanqueado = await cuenta.propietario.post(`${RUTA_CHEQUES}/${chequeId}/blanquear`, {
      motivo: 'Sin imprimir',
    });

    expect(blanqueado.cuerpo).toMatchObject({ estado: 'disponible', movimientoId: null });
    expect((await cuenta.propietario.get(`${RUTA_MOVIMIENTOS}/${movimientoId}`)).estado).toBe(404);
    const siguiente = await cuenta.propietario.get(
      `/api/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`,
    );
    expect(siguiente.cuerpo.numero).toBe(numero);
  });

  it('sin bancos.cheques.blanquear, blanquear responde 403', async () => {
    const { chequeId } = await emitir('2026-02-05');
    const sinPermiso = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Emite',
      apellidos: 'Sin blanquear',
      permisos: ['bancos.cheques.ver', 'bancos.cheques.emitir', 'bancos.cheques.anular'],
    });

    const respuesta = await sinPermiso.post(`${RUTA_CHEQUES}/${chequeId}/blanquear`, { motivo: 'x' });

    expect(respuesta.estado).toBe(403);
  });

  it('en un mes conciliado se anula con una nota de crédito inversa y ya no se blanquea', async () => {
    const enCirculacion = await emitir('2026-01-20');
    const otro = await emitir('2026-01-22', '30.00');
    await conciliarEnero();

    const alBlanquear = await cuenta.propietario.post(`${RUTA_CHEQUES}/${otro.chequeId}/blanquear`, { motivo: 'x' });
    const enElMesConciliado = await cuenta.propietario.post(`${RUTA_CHEQUES}/${enCirculacion.chequeId}/anular`, {
      motivo: 'Nunca se cobró',
      fecha: '2026-01-25',
    });
    const antes = await saldoDe(cuenta.propietario, cuentaBancariaId);
    const anulado = await cuenta.propietario.post(`${RUTA_CHEQUES}/${enCirculacion.chequeId}/anular`, {
      motivo: 'Nunca se cobró',
      fecha: '2026-02-10',
    });

    expect(alBlanquear.cuerpo.error.codigo).toBe('mes_conciliado');
    expect(enElMesConciliado.cuerpo.error.codigo).toBe('mes_conciliado');
    expect(anulado.cuerpo.estado).toBe('anulado');
    const original = await cuenta.propietario.get(`${RUTA_MOVIMIENTOS}/${enCirculacion.movimientoId}`);
    expect(original.cuerpo).toMatchObject({ anuladoEn: null, revertidoEn: expect.any(String) });
    expect(await inversosDe(cuenta.propietario, cuentaBancariaId)).toEqual([
      expect.objectContaining({
        tipo: 'credito',
        monto: '100.00',
        fecha: '2026-02-10',
        revierteAId: enCirculacion.movimientoId,
      }),
    ]);
    expect(antes).toBe('770.00');
    expect(await saldoDe(cuenta.propietario, cuentaBancariaId)).toBe('870.00');
  });
});
