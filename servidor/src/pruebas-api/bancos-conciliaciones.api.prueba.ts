import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let cuentaBancariaId: string;
let autoriza: ClienteApi;
let conceptoId = '';

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
  await usuario.post('/api/bancos/saldos-iniciales', {
    cuentaBancariaId: cuentaBancaria.cuerpo.id,
    tipo: 'credito',
    fecha: '2026-01-01',
    monto: '1000.00',
    referencia: null,
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
  conceptoId = await conceptoGeneral(cuenta.propietario);
  autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Conciliaciones',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
});

describe('conciliaciones por API', () => {
  it('flujo completo: iniciar, marcar, terminar, autorizar, bloquear el mes, iniciar el siguiente y eliminar', async () => {
    // Otra nota de crédito de Q 200 el 15 de enero, aparte del saldo inicial.
    const notaExtra = await cuenta.propietario.post('/api/bancos/notas', {
      cuentaBancariaId,
      tipo: 'credito',
      conceptoId,
      fecha: '2026-01-15',
      monto: '200.00',
      referencia: null,
      beneficiario: null,
      observaciones: null,
    });

    const iniciada = await cuenta.propietario.post('/api/bancos/conciliaciones', {
      cuentaBancariaId,
      anio: 2026,
      mes: 1,
    });
    expect(iniciada.estado).toBe(201);
    expect(iniciada.cuerpo).toMatchObject({ anio: 2026, mes: 1, estado: 'en_proceso' });
    const conciliacionId = iniciada.cuerpo.id as string;
    const idSaldoInicial = (iniciada.cuerpo.candidatos as Array<{ id: string; saldoInicial: boolean }>).find(
      (m) => m.saldoInicial,
    )!.id;

    // Sin marcar nada, todo (saldo inicial y nota extra) queda como crédito en tránsito: el banco no ha visto nada.
    const sinMarcar = await cuenta.propietario.get(`/api/bancos/conciliaciones/${conciliacionId}`);
    expect(sinMarcar.cuerpo.saldoQueDebeMostrarElEstadoDeCuenta).toBe('0.00');

    // Se marcan ambos: el saldo calculado coincide con el saldo según libros.
    const marcado = await cuenta.propietario.put(`/api/bancos/conciliaciones/${conciliacionId}/marcas`, {
      movimientoIds: [idSaldoInicial, notaExtra.cuerpo.id],
    });
    expect(marcado.cuerpo.saldoQueDebeMostrarElEstadoDeCuenta).toBe('1200.00');
    expect(marcado.cuerpo.partidas).toEqual({
      chequesEnCirculacion: [],
      otrosDebitosEnTransito: [],
      creditosEnTransito: [],
    });

    // Termina el propietario: pasa a elaborada.
    const terminada = await cuenta.propietario.post(`/api/bancos/conciliaciones/${conciliacionId}/terminar`, {});
    expect(terminada.estado).toBe(200);
    expect(terminada.cuerpo.estado).toBe('elaborada');

    // Quien la elaboró (el propietario) no la puede autorizar.
    const rechazaAutopropia = await cuenta.propietario.post(
      `/api/bancos/conciliaciones/${conciliacionId}/autorizar`,
      {},
    );
    expect(rechazaAutopropia.estado).toBe(422);

    // Otra persona sí la autoriza.
    const autorizada = await autoriza.post(`/api/bancos/conciliaciones/${conciliacionId}/autorizar`, {});
    expect(autorizada.estado).toBe(200);
    expect(autorizada.cuerpo.estado).toBe('autorizada');
    expect(autorizada.cuerpo.autorizadaPorNombre).toBe('Autoriza Conciliaciones');

    // La cuenta queda conciliada hasta enero: registrar ahí se rechaza.
    const rechazado = await cuenta.propietario.post('/api/bancos/notas', {
      cuentaBancariaId,
      tipo: 'debito',
      conceptoId,
      fecha: '2026-01-20',
      monto: '5.00',
      referencia: null,
      beneficiario: null,
      observaciones: null,
    });
    expect(rechazado.estado).toBe(422);

    // Se inicia febrero.
    const febrero = await cuenta.propietario.post('/api/bancos/conciliaciones', {
      cuentaBancariaId,
      anio: 2026,
      mes: 2,
    });
    expect(febrero.estado).toBe(201);
    expect(febrero.cuerpo.candidatos).toHaveLength(0);

    const lista = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${cuentaBancariaId}/conciliaciones`);
    expect(lista.cuerpo).toHaveLength(2);

    // Se elimina la última (febrero): reabre el mes.
    const eliminada = await cuenta.propietario.post(`/api/bancos/conciliaciones/${febrero.cuerpo.id}/eliminar`, {
      motivo: 'Me equivoqué de mes',
    });
    expect(eliminada.estado).toBe(204);

    // Ahora enero (autorizada) vuelve a ser la última: también se puede eliminar.
    const eliminaEnero = await cuenta.propietario.post(`/api/bancos/conciliaciones/${conciliacionId}/eliminar`, {
      motivo: 'Reabrir enero',
    });
    expect(eliminaEnero.estado).toBe(204);
  });

  it('se puede devolver una conciliación elaborada, con motivo', async () => {
    const iniciada = await cuenta.propietario.post('/api/bancos/conciliaciones', {
      cuentaBancariaId,
      anio: 2026,
      mes: 3,
    });
    const conciliacionId = iniciada.cuerpo.id as string;
    await cuenta.propietario.post(`/api/bancos/conciliaciones/${conciliacionId}/terminar`, {});

    const devuelta = await autoriza.post(`/api/bancos/conciliaciones/${conciliacionId}/devolver`, {
      motivo: 'Revisar',
    });
    expect(devuelta.estado).toBe(200);
    expect(devuelta.cuerpo.estado).toBe('en_proceso');

    // Se puede volver a marcar y terminar.
    expect(
      (await cuenta.propietario.put(`/api/bancos/conciliaciones/${conciliacionId}/marcas`, { movimientoIds: [] }))
        .estado,
    ).toBe(200);
    await cuenta.propietario.post(`/api/bancos/conciliaciones/${conciliacionId}/eliminar`, { motivo: 'limpiar' });
  });

  it('no se concilia un mes que todavía no terminó', async () => {
    const rechazado = await cuenta.propietario.post('/api/bancos/conciliaciones', {
      cuentaBancariaId,
      anio: 2026,
      mes: 12,
    });
    expect(rechazado.estado).toBe(422);
  });

  it('sin permisos, ver, iniciar, marcar, terminar, autorizar y eliminar responden 403', async () => {
    const iniciada = await cuenta.propietario.post('/api/bancos/conciliaciones', {
      cuentaBancariaId,
      anio: 2026,
      mes: 4,
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
      (await sinPermisos.post('/api/bancos/conciliaciones', { cuentaBancariaId, anio: 2026, mes: 5 })).estado,
    ).toBe(403);
    expect(
      (await sinPermisos.put(`/api/bancos/conciliaciones/${conciliacionId}/marcas`, { movimientoIds: [] })).estado,
    ).toBe(403);
    expect((await sinPermisos.post(`/api/bancos/conciliaciones/${conciliacionId}/terminar`, {})).estado).toBe(403);
    expect((await sinPermisos.post(`/api/bancos/conciliaciones/${conciliacionId}/autorizar`, {})).estado).toBe(403);
    expect(
      (await sinPermisos.post(`/api/bancos/conciliaciones/${conciliacionId}/devolver`, { motivo: 'x' })).estado,
    ).toBe(403);
    expect(
      (await sinPermisos.post(`/api/bancos/conciliaciones/${conciliacionId}/eliminar`, { motivo: 'x' })).estado,
    ).toBe(403);

    await cuenta.propietario.post(`/api/bancos/conciliaciones/${conciliacionId}/eliminar`, { motivo: 'limpiar' });
  });
});
