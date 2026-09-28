import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA_MOVIMIENTOS = '/api/bancos/movimientos';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId: string;

/** Un banco y una cuenta bancaria activa, con saldo inicial de Q 1,000.00. */
async function crearCuentaBancaria(usuario: ClienteApi, nombre: string): Promise<string> {
  const banco = await usuario.post('/api/bancos/bancos', { nombre, observaciones: null, activo: true });
  const cuentaBancaria = await usuario.post('/api/bancos/cuentas-bancarias', {
    nombre,
    bancoId: banco.cuerpo.id as string,
    numero: nombre,
    tipo: 'monetaria',
    observaciones: null,
    activo: true,
  });
  await usuario.post(RUTA_MOVIMIENTOS, {
    cuentaBancariaId: cuentaBancaria.cuerpo.id,
    tipo: 'credito',
    fecha: '2026-01-01',
    monto: '1000.00',
    saldoInicial: true,
    referencia: null,
    beneficiario: null,
    observaciones: null,
  });
  return cuentaBancaria.cuerpo.id as string;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Cheques', usuario: 'propietariocheques', modulos: ['bancos'] });
  cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Cuenta de cheques');
});

describe('chequeras y cheques por API', () => {
  it('crea una chequera de 1 a 50 con todos sus cheques disponibles', async () => {
    const creada = await cuenta.propietario.post(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`, {
      serie: null,
      desde: 1,
      hasta: 50,
    });

    expect(creada.estado).toBe(201);
    expect(creada.cuerpo).toMatchObject({
      desde: 1,
      hasta: 50,
      activa: true,
      disponibles: 50,
      emitidos: 0,
      anulados: 0,
    });
  });

  it('se ven sus cheques, todos disponibles', async () => {
    const chequeras = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`);
    const chequeraId = chequeras.cuerpo[0].id as string;

    const cheques = await cuenta.propietario.get(`/api/bancos/chequeras/${chequeraId}/cheques`);

    expect(cheques.cuerpo).toHaveLength(50);
    expect(cheques.cuerpo[0]).toMatchObject({ numero: 1, estado: 'disponible' });
  });

  it('propone el siguiente disponible, lo emite y aparece en movimientos con el saldo', async () => {
    const siguiente = await cuenta.propietario.get(
      `/api/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`,
    );
    expect(siguiente.cuerpo.numero).toBe(1);

    const emitido = await cuenta.propietario.post(`/api/bancos/cheques/${siguiente.cuerpo.id}/emitir`, {
      fecha: '2026-02-01',
      monto: '150.00',
      beneficiario: 'Proveedor de prueba',
      noNegociable: true,
      referencia: null,
      observaciones: null,
    });

    expect(emitido.estado).toBe(200);
    expect(emitido.cuerpo).toMatchObject({ tipo: 'cheque', monto: '150.00', beneficiario: 'Proveedor de prueba' });

    const movimiento = await cuenta.propietario.get(`${RUTA_MOVIMIENTOS}/${emitido.cuerpo.id}`);
    expect(movimiento.cuerpo.numeroDeCheque).toBe(1);

    const cuentaBancaria = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}`);
    expect(cuentaBancaria.cuerpo.saldo).toBe('850.00');

    const siguienteAhora = await cuenta.propietario.get(
      `/api/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`,
    );
    expect(siguienteAhora.cuerpo.numero).toBe(2);
  });

  it('se anula y su movimiento queda anulado también', async () => {
    const siguiente = await cuenta.propietario.get(
      `/api/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`,
    );
    const emitido = await cuenta.propietario.post(`/api/bancos/cheques/${siguiente.cuerpo.id}/emitir`, {
      fecha: '2026-02-02',
      monto: '50.00',
      beneficiario: 'Otro proveedor',
      noNegociable: true,
      referencia: null,
      observaciones: null,
    });

    const anulado = await cuenta.propietario.post(`/api/bancos/cheques/${siguiente.cuerpo.id}/anular`, {
      motivo: 'Se perdió',
    });

    expect(anulado.estado).toBe(200);
    expect(anulado.cuerpo.estado).toBe('anulado');
    const movimientoAnulado = await cuenta.propietario.get(`${RUTA_MOVIMIENTOS}/${emitido.cuerpo.id}`);
    expect(movimientoAnulado.cuerpo.anuladoEn).toEqual(expect.any(String));
  });

  it('sin permisos, ver, crear, emitir y anular responden 403', async () => {
    const sinPermisos = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Sin',
      apellidos: 'Permisos',
      permisos: [],
    });
    const chequeras = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`);
    const chequeraId = chequeras.cuerpo[0].id as string;
    const siguiente = await cuenta.propietario.get(
      `/api/bancos/cuentas-bancarias/${cuentaBancariaId}/siguiente-cheque`,
    );

    expect((await sinPermisos.get(`/api/bancos/chequeras/${chequeraId}/cheques`)).estado).toBe(403);
    expect(
      (
        await sinPermisos.post(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/chequeras`, {
          serie: 'B',
          desde: 1,
          hasta: 10,
        })
      ).estado,
    ).toBe(403);
    expect(
      (
        await sinPermisos.post(`/api/bancos/cheques/${siguiente.cuerpo.id}/emitir`, {
          fecha: '2026-02-03',
          monto: '10.00',
          beneficiario: 'X',
          noNegociable: true,
          referencia: null,
          observaciones: null,
        })
      ).estado,
    ).toBe(403);
    expect((await sinPermisos.post(`/api/bancos/cheques/${siguiente.cuerpo.id}/anular`, { motivo: 'X' })).estado).toBe(
      403,
    );
  });
});
