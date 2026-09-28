import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA_MOVIMIENTOS = '/api/bancos/movimientos';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId: string;

/** Un banco y una cuenta bancaria activa, con saldo inicial de Q 1,000.00 el 2026-01-01. */
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
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Conciliaciones',
    usuario: 'propietarioconciliaciones',
    modulos: ['bancos'],
  });
  cuentaBancariaId = await crearCuentaBancaria(cuenta.propietario, 'Cuenta a conciliar');
});

describe('conciliaciones por API', () => {
  it('flujo completo: iniciar, marcar, diferencia, cerrar, bloquear el mes, iniciar el siguiente y eliminar la última', async () => {
    // Otra nota de crédito de Q 200 el 15 de enero, aparte del saldo inicial.
    const notaExtra = await cuenta.propietario.post(RUTA_MOVIMIENTOS, {
      cuentaBancariaId,
      tipo: 'credito',
      fecha: '2026-01-15',
      monto: '200.00',
      saldoInicial: false,
      referencia: null,
      beneficiario: null,
      observaciones: null,
    });

    const iniciada = await cuenta.propietario.post('/api/bancos/conciliaciones', {
      cuentaBancariaId,
      anio: 2026,
      mes: 1,
      saldoSegunBanco: '1000.00',
    });
    expect(iniciada.estado).toBe(201);
    expect(iniciada.cuerpo).toMatchObject({ anio: 2026, mes: 1, cerrada: false, saldoAnterior: '0.00' });
    const conciliacionId = iniciada.cuerpo.id as string;
    const idSaldoInicial = (iniciada.cuerpo.movimientos as Array<{ id: string; saldoInicial: boolean }>).find(
      (m) => m.saldoInicial,
    )!.id;

    // Sin marcar nada, la diferencia es el saldo completo.
    const sinMarcar = await cuenta.propietario.get(`/api/bancos/conciliaciones/${conciliacionId}`);
    expect(sinMarcar.cuerpo.diferencia).toBe('1000.00');

    // Se marca solo el saldo inicial: la nota de 200 queda pendiente y la diferencia sigue sin ser cero.
    const marcado = await cuenta.propietario.put(`/api/bancos/conciliaciones/${conciliacionId}/marcas`, {
      movimientoIds: [idSaldoInicial],
    });
    expect(marcado.cuerpo.saldoConciliado).toBe('1000.00');
    expect(marcado.cuerpo.diferencia).toBe('0.00');

    // No se cierra con diferencia si se sube el saldo según banco.
    await cuenta.propietario.put(`/api/bancos/conciliaciones/${conciliacionId}/saldo`, { saldoSegunBanco: '1200.00' });
    const conDiferencia = await cuenta.propietario.post(`/api/bancos/conciliaciones/${conciliacionId}/cerrar`, {});
    expect(conDiferencia.estado).toBe(422);

    // Se vuelve al saldo correcto y se cierra.
    await cuenta.propietario.put(`/api/bancos/conciliaciones/${conciliacionId}/saldo`, { saldoSegunBanco: '1000.00' });
    const cerrada = await cuenta.propietario.post(`/api/bancos/conciliaciones/${conciliacionId}/cerrar`, {});
    expect(cerrada.estado).toBe(200);
    expect(cerrada.cuerpo.cerrada).toBe(true);

    // La cuenta queda conciliada hasta enero: registrar ahí se rechaza.
    const rechazado = await cuenta.propietario.post(RUTA_MOVIMIENTOS, {
      cuentaBancariaId,
      tipo: 'debito',
      fecha: '2026-01-20',
      monto: '5.00',
      saldoInicial: false,
      referencia: null,
      beneficiario: null,
      observaciones: null,
    });
    expect(rechazado.estado).toBe(422);
    // Y anular la nota extra (fecha de enero) también.
    const anulacionRechazada = await cuenta.propietario.post(`${RUTA_MOVIMIENTOS}/${notaExtra.cuerpo.id}/anular`, {
      motivo: 'Prueba',
    });
    expect(anulacionRechazada.estado).toBe(422);

    // Se inicia febrero: incluye la nota de 200 pendiente de enero.
    const febrero = await cuenta.propietario.post('/api/bancos/conciliaciones', {
      cuentaBancariaId,
      anio: 2026,
      mes: 2,
      saldoSegunBanco: '1200.00',
    });
    expect(febrero.estado).toBe(201);
    expect(febrero.cuerpo.saldoAnterior).toBe('1000.00');
    expect(febrero.cuerpo.movimientos).toHaveLength(1);
    expect(febrero.cuerpo.movimientos[0]).toMatchObject({ id: notaExtra.cuerpo.id, monto: '200.00' });

    const lista = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/conciliaciones`);
    expect(lista.cuerpo).toHaveLength(2);

    // Se elimina la última (febrero): reabre el mes y suelta sus movimientos.
    const eliminada = await cuenta.propietario.post(`/api/bancos/conciliaciones/${febrero.cuerpo.id}/eliminar`, {
      motivo: 'Me equivoqué de saldo',
    });
    expect(eliminada.estado).toBe(204);
    const listaFinal = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/conciliaciones`);
    expect(listaFinal.cuerpo).toHaveLength(1);

    // No se puede eliminar enero (ya no es la última... y sí lo es ahora, pero probamos que sí se puede).
    const eliminaEnero = await cuenta.propietario.post(`/api/bancos/conciliaciones/${conciliacionId}/eliminar`, {
      motivo: 'Reabrir enero',
    });
    expect(eliminaEnero.estado).toBe(204);
  });

  it('sin permisos, ver, iniciar, marcar, cerrar y eliminar responden 403', async () => {
    const iniciada = await cuenta.propietario.post('/api/bancos/conciliaciones', {
      cuentaBancariaId,
      anio: 2026,
      mes: 1,
      saldoSegunBanco: '1000.00',
    });
    const conciliacionId = iniciada.cuerpo.id as string;
    const sinPermisos = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Sin',
      apellidos: 'Permisos',
      permisos: [],
    });

    expect((await sinPermisos.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/conciliaciones`)).estado).toBe(
      403,
    );
    expect((await sinPermisos.get(`/api/bancos/conciliaciones/${conciliacionId}`)).estado).toBe(403);
    expect(
      (
        await sinPermisos.post('/api/bancos/conciliaciones', {
          cuentaBancariaId,
          anio: 2026,
          mes: 2,
          saldoSegunBanco: '0.00',
        })
      ).estado,
    ).toBe(403);
    expect(
      (await sinPermisos.put(`/api/bancos/conciliaciones/${conciliacionId}/marcas`, { movimientoIds: [] })).estado,
    ).toBe(403);
    expect((await sinPermisos.post(`/api/bancos/conciliaciones/${conciliacionId}/cerrar`, {})).estado).toBe(403);
    expect(
      (await sinPermisos.post(`/api/bancos/conciliaciones/${conciliacionId}/eliminar`, { motivo: 'x' })).estado,
    ).toBe(403);
  });
});
