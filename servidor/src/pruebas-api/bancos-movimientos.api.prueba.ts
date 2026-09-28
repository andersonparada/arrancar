import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA_NOTAS = '/api/bancos/notas';
const RUTA_SALDOS_INICIALES = '/api/bancos/saldos-iniciales';
const RUTA_MOVIMIENTOS = '/api/bancos/movimientos';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

/** Lo que el registro necesita elegir, registrado en la cuenta del usuario. */
async function crearReferencias(usuario: ClienteApi, nombre = 'Principal') {
  const banco = await usuario.post('/api/bancos/bancos', {
    nombre,
    observaciones: 'Una nota de prueba.',
    activo: true,
  });
  const cuentaBancaria = await usuario.post('/api/bancos/cuentas-bancarias', {
    nombre,
    bancoId: banco.cuerpo.id as string,
    numero: nombre,
    tipo: 'monetaria',
    observaciones: 'Una nota de prueba.',
    activo: true,
  });
  return { cuentaBancariaId: cuentaBancaria.cuerpo.id as string };
}

let referencias: Awaited<ReturnType<typeof crearReferencias>>;
let referenciasAjenas: Awaited<ReturnType<typeof crearReferencias>>;

const notaDatos = (cambios: Record<string, unknown> = {}) => ({
  tipo: 'credito',
  fecha: '2026-01-15',
  monto: '12.50',
  referencia: 'Registro de prueba',
  beneficiario: 'Registro de prueba',
  observaciones: 'Una nota de prueba.',
  ...referencias,
  ...cambios,
});

const saldoInicialDatos = (cambios: Record<string, unknown> = {}) => ({
  tipo: 'credito',
  fecha: '2026-01-01',
  monto: '1000.00',
  referencia: 'Saldo inicial de prueba',
  observaciones: null,
  ...referencias,
  ...cambios,
});

beforeAll(async () => {
  const modulos = ['bancos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno', modulos });
  referencias = await crearReferencias(cuenta.propietario);
  referenciasAjenas = await crearReferencias(otraCuenta.propietario);
});

describe('notas por API', () => {
  it('se registran, se listan y se corrigen', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, notaDatos());
    const id = creada.cuerpo.id;
    const cambiada = await cuenta.propietario.put(
      `${RUTA_NOTAS}/${id}`,
      notaDatos({ referencia: 'Registro cambiado' }),
    );

    expect(creada.estado).toBe(201);
    expect((await cuenta.propietario.get(`${RUTA_NOTAS}/${id}`)).cuerpo).toEqual(cambiada.cuerpo);
    expect((await cuenta.propietario.get(RUTA_NOTAS)).cuerpo).toContainEqual(cambiada.cuerpo);
    expect(cambiada.cuerpo.referencia).toBe('Registro cambiado');
  });

  it('se anulan con motivo', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, notaDatos());
    const anulada = await cuenta.propietario.post(`${RUTA_NOTAS}/${creada.cuerpo.id}/anular`, {
      motivo: 'Cancelación de prueba',
    });

    expect(anulada.estado).toBe(200);
    expect(anulada.cuerpo).toMatchObject({
      id: creada.cuerpo.id,
      anuladoEn: expect.any(String),
      motivoDeAnulacion: 'Cancelación de prueba',
    });
  });

  it('no acepta tocar el saldo inicial de la cuenta', async () => {
    const inicial = await cuenta.propietario.post(RUTA_SALDOS_INICIALES, saldoInicialDatos({ fecha: '2025-01-01' }));

    const corregido = await cuenta.propietario.put(`${RUTA_NOTAS}/${inicial.cuerpo.id}`, notaDatos());
    const anulado = await cuenta.propietario.post(`${RUTA_NOTAS}/${inicial.cuerpo.id}/anular`, { motivo: 'x' });

    expect(corregido.cuerpo.error.codigo).toBe('no_es_una_nota');
    expect(anulado.cuerpo.error.codigo).toBe('no_es_una_nota');
  });

  it('sin sobregiro permitido, un débito no deja la cuenta en negativo', async () => {
    const nueva = await crearReferencias(cuenta.propietario, 'Vacía');

    const debito = await cuenta.propietario.post(RUTA_NOTAS, notaDatos({ ...nueva, tipo: 'debito' }));

    expect(debito.cuerpo.error.codigo).toBe('saldo_insuficiente');
  });

  it('no acepta una cuenta bancaria de otra cuenta', async () => {
    const conAjeno = await cuenta.propietario.post(
      RUTA_NOTAS,
      notaDatos({ cuentaBancariaId: referenciasAjenas.cuentaBancariaId }),
    );

    expect(conAjeno.estado).toBe(404);
  });

  it('otra cuenta no las ve', async () => {
    const ajena = await otraCuenta.propietario.post(RUTA_NOTAS, notaDatos(referenciasAjenas));

    expect((await cuenta.propietario.get(`${RUTA_NOTAS}/${ajena.cuerpo.id}`)).estado).toBe(404);
    expect((await otraCuenta.propietario.get(RUTA_NOTAS)).cuerpo).toContainEqual(ajena.cuerpo);
  });

  it('para registrar hace falta el permiso de gestionar', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'SoloNotas',
      apellidos: 'Lectura',
      permisos: ['bancos.notas.ver'],
    });

    expect((await lector.get(RUTA_NOTAS)).estado).toBe(200);
    expect((await lector.post(RUTA_NOTAS, notaDatos())).estado).toBe(403);
  });

  it('anular pide su propio permiso', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, notaDatos());
    const gestor = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Registra',
      apellidos: 'Sin anular',
      permisos: ['bancos.notas.ver', 'bancos.notas.gestionar'],
    });

    const anulada = await gestor.post(`${RUTA_NOTAS}/${creada.cuerpo.id}/anular`, { motivo: 'Sin permiso' });

    expect(anulada.estado).toBe(403);
  });
});

describe('saldos iniciales por API', () => {
  it('se registran, se corrigen y se importan y exportan en Excel', async () => {
    const nueva = await crearReferencias(cuenta.propietario, 'Saldo inicial');

    const creado = await cuenta.propietario.post(RUTA_SALDOS_INICIALES, saldoInicialDatos({ ...nueva }));
    const cambiado = await cuenta.propietario.put(
      `${RUTA_SALDOS_INICIALES}/${creado.cuerpo.id}`,
      saldoInicialDatos({ ...nueva, monto: '2000.00' }),
    );

    expect(creado.estado).toBe(201);
    expect(cambiado.cuerpo.monto).toBe('2000.00');
    expect(
      (await cuenta.propietario.get(`${RUTA_SALDOS_INICIALES}?cuentaBancariaId=${nueva.cuentaBancariaId}`)).cuerpo,
    ).toContainEqual(cambiado.cuerpo);

    const exportado = await cuenta.propietario.get(`${RUTA_SALDOS_INICIALES}/exportar`);
    expect(exportado.estado).toBe(200);
    expect(exportado.cabeceras['content-type']).toBe(TIPO_EXCEL);
  });

  it('se anulan con motivo', async () => {
    const nueva = await crearReferencias(cuenta.propietario, 'Saldo a anular');
    const creado = await cuenta.propietario.post(RUTA_SALDOS_INICIALES, saldoInicialDatos({ ...nueva }));

    const anulado = await cuenta.propietario.post(`${RUTA_SALDOS_INICIALES}/${creado.cuerpo.id}/anular`, {
      motivo: 'Error de captura',
    });

    expect(anulado.estado).toBe(200);
    expect(anulado.cuerpo.anuladoEn).toEqual(expect.any(String));
  });

  it('no acepta tocar una nota suelta', async () => {
    const creada = await cuenta.propietario.post(RUTA_NOTAS, notaDatos({ fecha: '2026-06-01' }));

    const corregido = await cuenta.propietario.put(`${RUTA_SALDOS_INICIALES}/${creada.cuerpo.id}`, saldoInicialDatos());
    const anulado = await cuenta.propietario.post(`${RUTA_SALDOS_INICIALES}/${creada.cuerpo.id}/anular`, {
      motivo: 'x',
    });

    expect(corregido.cuerpo.error.codigo).toBe('no_es_un_saldo_inicial');
    expect(anulado.cuerpo.error.codigo).toBe('no_es_un_saldo_inicial');
  });

  it('para gestionar hace falta bancos.saldos-iniciales.gestionar; ver usa el permiso de cuentas bancarias', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'SoloCuentas',
      apellidos: 'VeCuentas',
      permisos: ['bancos.cuentas-bancarias.ver'],
    });

    expect((await lector.get(RUTA_SALDOS_INICIALES)).estado).toBe(200);
    expect((await lector.post(RUTA_SALDOS_INICIALES, saldoInicialDatos())).estado).toBe(403);
  });
});

describe('reporte de movimientos por API', () => {
  it('sin cuenta, los tres saldos son null', async () => {
    await cuenta.propietario.post(RUTA_NOTAS, notaDatos({ fecha: '2026-07-01' }));

    const reporte = await cuenta.propietario.get(`${RUTA_MOVIMIENTOS}/reporte`);

    expect(reporte.estado).toBe(200);
    expect(reporte.cuerpo.saldoAnterior).toBeNull();
    expect(reporte.cuerpo.saldoFinal).toBeNull();
  });

  it('con cuenta, arma el saldo anterior y el saldo corrido', async () => {
    const nueva = await crearReferencias(cuenta.propietario, 'Reporte');
    await cuenta.propietario.post(RUTA_SALDOS_INICIALES, saldoInicialDatos({ ...nueva, fecha: '2026-08-01' }));
    await cuenta.propietario.post(RUTA_NOTAS, notaDatos({ ...nueva, fecha: '2026-08-15', monto: '100.00' }));

    const reporte = await cuenta.propietario.get(
      `${RUTA_MOVIMIENTOS}/reporte?cuentaBancariaId=${nueva.cuentaBancariaId}&desde=2026-08-10`,
    );

    expect(reporte.cuerpo.saldoAnterior).toBe('1000.00');
    expect(reporte.cuerpo.saldoFinal).toBe('1100.00');
  });

  it('se exporta con los filtros, pero no se importa', async () => {
    const exportado = await cuenta.propietario.get(`${RUTA_MOVIMIENTOS}/exportar?desde=2026-01-01&hasta=2026-12-31`);

    expect(exportado.estado).toBe(200);
    expect(exportado.cabeceras['content-type']).toBe(TIPO_EXCEL);
    // Sin ruta de plantilla ni de importar, "plantilla" se lee como el id de un movimiento y no es válido.
    expect((await cuenta.propietario.get(`${RUTA_MOVIMIENTOS}/plantilla`)).estado).toBe(400);
  });

  it('para ver o exportar hacen falta sus propios permisos', async () => {
    const sinPermisos = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Sin',
      apellidos: 'Permisos',
      permisos: [],
    });

    expect((await sinPermisos.get(`${RUTA_MOVIMIENTOS}/reporte`)).estado).toBe(403);
    expect((await sinPermisos.get(`${RUTA_MOVIMIENTOS}/exportar`)).estado).toBe(403);

    const soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'SoloReporte',
      apellidos: 'VeReporte',
      permisos: ['bancos.movimientos.ver'],
    });
    expect((await soloVer.get(`${RUTA_MOVIMIENTOS}/reporte`)).estado).toBe(200);
    expect((await soloVer.get(`${RUTA_MOVIMIENTOS}/exportar`)).estado).toBe(403);
  });
});
