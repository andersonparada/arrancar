import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearCuentaBancaria, terminarConciliacionConSaldo } from './soporte/escenarios-de-bancos.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let propietario: ClienteApi;
let autoriza: ClienteApi;

/** Inicia la conciliación de enero de una cuenta nueva (saldo inicial de Q 1,000.00) con el saldo inicial marcado. */
async function iniciarConciliacion(nombre: string): Promise<string> {
  const cuentaBancariaId = await crearCuentaBancaria(propietario, nombre);
  const iniciada = await propietario.post('/api/bancos/conciliaciones', { cuentaBancariaId, anio: 2026, mes: 1 });
  const saldoInicial = (iniciada.cuerpo.candidatos as Array<{ id: string; saldoInicial: boolean }>).find(
    (m) => m.saldoInicial,
  )!;
  await propietario.put(`${rutaDe(iniciada.cuerpo.id)}/marcas`, { movimientoIds: [saldoInicial.id] });
  return iniciada.cuerpo.id as string;
}

const rutaDe = (id: string) => `/api/bancos/conciliaciones/${id}`;
const transcribir = (id: string, saldoEstadoDeCuenta: string | null) =>
  propietario.put(`${rutaDe(id)}/saldo-del-estado-de-cuenta`, { saldoEstadoDeCuenta });

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Saldo del estado de cuenta',
    usuario: 'propietariosaldoestadocuenta',
    modulos: ['bancos'],
  });
  propietario = cuenta.propietario;
  autoriza = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Autoriza',
    apellidos: 'Saldo',
    permisos: ['bancos.conciliaciones.ver', 'bancos.conciliaciones.autorizar'],
  });
});

describe('transcribir el saldo del estado de cuenta', () => {
  it('guarda el saldo (también negativo), lo devuelve con la diferencia y null lo borra', async () => {
    const id = await iniciarConciliacion('Saldo transcrito');
    const inicial = await propietario.get(rutaDe(id));
    expect(inicial.cuerpo).toMatchObject({
      saldoEstadoDeCuenta: null,
      diferenciaConElEstadoDeCuenta: null,
      previaAlSaldoTranscrito: false,
    });

    const guardado = await transcribir(id, '990.5');
    expect(guardado.estado).toBe(200);
    expect(guardado.cuerpo).toMatchObject({ saldoEstadoDeCuenta: '990.50', diferenciaConElEstadoDeCuenta: '9.50' });
    expect((await transcribir(id, '-50.25')).cuerpo.saldoEstadoDeCuenta).toBe('-50.25');
    expect((await transcribir(id, null)).cuerpo.saldoEstadoDeCuenta).toBeNull();
    expect((await transcribir(id, 'abc')).estado).toBe(400);
  });

  it('no se transcribe en una conciliación elaborada (422)', async () => {
    const id = await iniciarConciliacion('Saldo en elaborada');
    expect((await terminarConciliacionConSaldo(propietario, id)).estado).toBe(200);

    const rechazada = await transcribir(id, '1.00');

    expect(rechazada.estado).toBe(422);
    expect(rechazada.cuerpo.error.codigo).toBe('conciliacion_no_esta_en_proceso');
  });

  it('exige el permiso de conciliar (403 con solo autorizar)', async () => {
    const id = await iniciarConciliacion('Saldo sin permiso');
    const respuesta = await autoriza.put(`${rutaDe(id)}/saldo-del-estado-de-cuenta`, { saldoEstadoDeCuenta: '1.00' });
    expect(respuesta.estado).toBe(403);
  });
});

describe('terminar con el saldo del estado de cuenta', () => {
  it('sin saldo responde 400', async () => {
    const id = await iniciarConciliacion('Terminar sin saldo');

    const respuesta = await propietario.post(`${rutaDe(id)}/terminar`, {});

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('falta_el_saldo_del_estado_de_cuenta');
  });

  it('con un saldo distinto responde 422 con el detalle, y guardar el saldo sí deja', async () => {
    const id = await iniciarConciliacion('Terminar con diferencia');
    expect((await transcribir(id, '999.00')).estado).toBe(200);

    const respuesta = await propietario.post(`${rutaDe(id)}/terminar`, {});

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('saldo_del_estado_de_cuenta_no_coincide');
    expect(respuesta.cuerpo.error.detalles).toEqual({ transcrito: '999.00', calculado: '1000.00', diferencia: '1.00' });
    expect((await propietario.get(rutaDe(id))).cuerpo.estado).toBe('en_proceso');

    await transcribir(id, '1000');
    const terminada = await propietario.post(`${rutaDe(id)}/terminar`, {});
    expect(terminada.estado).toBe(200);
    expect(terminada.cuerpo).toMatchObject({ estado: 'elaborada', saldoEstadoDeCuenta: '1000.00' });
  });

  it('la primera conciliación de una cuenta también pide el saldo y lo compara', async () => {
    const cuentaBancariaId = await crearCuentaBancaria(propietario, 'Primera con saldo');
    const iniciada = await propietario.post('/api/bancos/conciliaciones', { cuentaBancariaId, anio: 2026, mes: 2 });
    const saldoInicial = (iniciada.cuerpo.candidatos as Array<{ id: string; saldoInicial: boolean }>).find(
      (m) => m.saldoInicial,
    )!;
    await propietario.put(`${rutaDe(iniciada.cuerpo.id)}/marcas`, { movimientoIds: [saldoInicial.id] });

    expect((await propietario.post(`${rutaDe(iniciada.cuerpo.id)}/terminar`, {})).estado).toBe(400);
    expect((await terminarConciliacionConSaldo(propietario, iniciada.cuerpo.id)).estado).toBe(200);
  });
});

describe('autorizar con el saldo del estado de cuenta', () => {
  it('con un saldo que ya no coincide con la foto responde 422', async () => {
    const id = await iniciarConciliacion('Autorizar con diferencia');
    await terminarConciliacionConSaldo(propietario, id);
    await comoPropietario("update bancos.conciliaciones set saldo_estado_de_cuenta = '999.00' where id = $1", [id]);

    const respuesta = await autoriza.post(`${rutaDe(id)}/autorizar`, {});

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('saldo_del_estado_de_cuenta_no_coincide');
  });

  it('una elaborada previa al saldo no se autoriza: se devuelve, se transcribe y sigue el flujo', async () => {
    const id = await iniciarConciliacion('Elaborada previa');
    await terminarConciliacionConSaldo(propietario, id);
    // Como la dejó la migración: elaborada, sin saldo y marcada como previa.
    await comoPropietario(
      'update bancos.conciliaciones set saldo_estado_de_cuenta = null, previa_al_saldo_transcrito = true where id = $1',
      [id],
    );
    expect((await propietario.get(rutaDe(id))).cuerpo.previaAlSaldoTranscrito).toBe(true);

    const rechazada = await autoriza.post(`${rutaDe(id)}/autorizar`, {});
    expect(rechazada.estado).toBe(400);
    expect(rechazada.cuerpo.error.codigo).toBe('falta_el_saldo_del_estado_de_cuenta');
    expect(rechazada.cuerpo.error.mensaje).toContain('Devuélvala');

    const devuelta = await autoriza.post(`${rutaDe(id)}/devolver`, { motivo: 'Falta el saldo del estado de cuenta' });
    expect(devuelta.cuerpo).toMatchObject({ estado: 'en_proceso', previaAlSaldoTranscrito: false });
    expect((await propietario.post(`${rutaDe(id)}/terminar`, {})).estado).toBe(400);

    expect((await terminarConciliacionConSaldo(propietario, id)).estado).toBe(200);
    expect((await autoriza.post(`${rutaDe(id)}/autorizar`, {})).cuerpo.estado).toBe('autorizada');
  });

  it('devolver deja en la auditoría el saldo transcrito tal como estaba', async () => {
    const id = await iniciarConciliacion('Devolver con saldo');
    await terminarConciliacionConSaldo(propietario, id);

    await autoriza.post(`${rutaDe(id)}/devolver`, { motivo: 'Revisar' });

    const filas = await comoPropietario<{ anterior: { saldoEstadoDeCuenta: string } }>(
      "select anterior from core.auditoria where recurso = 'bancos.conciliaciones' and accion = 'devolver' and registro_id = $1",
      [id],
    );
    expect(filas[0]!.anterior.saldoEstadoDeCuenta).toBe('1000.00');
  });
});

describe('las reglas de la base', () => {
  it('una autorizada que se quede sin saldo, o con uno distinto del calculado, falla por el check', async () => {
    const id = await iniciarConciliacion('Check de la base');
    await terminarConciliacionConSaldo(propietario, id);
    expect((await autoriza.post(`${rutaDe(id)}/autorizar`, {})).estado).toBe(200);

    await expect(
      comoPropietario('update bancos.conciliaciones set saldo_estado_de_cuenta = null where id = $1', [id]),
    ).rejects.toThrow(/conciliaciones_saldo_al_terminar/);
    await expect(
      comoPropietario("update bancos.conciliaciones set saldo_estado_de_cuenta = '1.00' where id = $1", [id]),
    ).rejects.toThrow(/conciliaciones_saldo_coincide_al_autorizar/);
  });

  it('una conciliación en proceso no puede ser previa', async () => {
    const id = await iniciarConciliacion('Previa en proceso');
    await expect(
      comoPropietario('update bancos.conciliaciones set previa_al_saldo_transcrito = true where id = $1', [id]),
    ).rejects.toThrow(/conciliaciones_previa_no_en_proceso/);
  });
});
