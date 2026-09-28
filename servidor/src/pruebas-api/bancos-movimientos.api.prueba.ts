import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/bancos/movimientos';
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

const datos = (cambios: Record<string, unknown> = {}) => ({
  tipo: 'credito',
  fecha: '2026-01-15',
  monto: '12.50',
  saldoInicial: false,
  referencia: 'Registro de prueba',
  beneficiario: 'Registro de prueba',
  observaciones: 'Una nota de prueba.',
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

describe('movimientos por API', () => {
  it('se registran, se listan y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(`${RUTA}/${id}`, datos({ referencia: 'Registro cambiado' }));

    expect(creado.estado).toBe(201);
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect((await cuenta.propietario.get(RUTA)).cuerpo).toEqual([cambiado.cuerpo]);
    expect(cambiado.cuerpo.referencia).toBe('Registro cambiado');
  });

  it('se anulan con motivo', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const anulado = await cuenta.propietario.post(`${RUTA}/${creado.cuerpo.id}/anular`, {
      motivo: 'Cancelación de prueba',
    });

    expect(anulado.estado).toBe(200);
    expect(anulado.cuerpo).toMatchObject({
      id: creado.cuerpo.id,
      anuladoEn: expect.any(String),
      motivoDeAnulacion: 'Cancelación de prueba',
    });
  });

  it('la cuenta bancaria muestra su saldo y la lista filtra por cuenta y fechas', async () => {
    const otra = await crearReferencias(cuenta.propietario, 'Otra');
    await cuenta.propietario.post(RUTA, datos({ fecha: '2026-02-01', monto: '1000.10' }));
    await cuenta.propietario.post(RUTA, datos({ fecha: '2026-02-02', tipo: 'debito', monto: '0.20' }));
    await cuenta.propietario.post(RUTA, datos({ ...otra, fecha: '2026-02-01' }));

    const filtrados = await cuenta.propietario.get(
      `${RUTA}?cuentaBancariaId=${referencias.cuentaBancariaId}&desde=2026-02-01&hasta=2026-02-28`,
    );
    const cuentaBancaria = await cuenta.propietario.get(`/api/bancos/cuentas-bancarias/${otra.cuentaBancariaId}`);

    expect(filtrados.cuerpo.map((m: { monto: string }) => m.monto)).toEqual(['0.20', '1000.10']);
    expect(cuentaBancaria.cuerpo.saldo).toBe('12.50');
  });

  it('sin sobregiro permitido, un débito no deja la cuenta en negativo', async () => {
    const nueva = await crearReferencias(cuenta.propietario, 'Vacía');

    const debito = await cuenta.propietario.post(RUTA, datos({ ...nueva, tipo: 'debito' }));

    expect(debito.cuerpo.error.codigo).toBe('saldo_insuficiente');
  });

  it('anular pide su propio permiso', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const gestor = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Registra',
      apellidos: 'Sin anular',
      permisos: ['bancos.movimientos.ver', 'bancos.movimientos.gestionar'],
    });

    const anulado = await gestor.post(`${RUTA}/${creado.cuerpo.id}/anular`, { motivo: 'Sin permiso' });

    expect(anulado.estado).toBe(403);
  });

  it('no acepta una cuenta bancaria de otra cuenta', async () => {
    const conAjeno = await cuenta.propietario.post(
      RUTA,
      datos({ cuentaBancariaId: referenciasAjenas.cuentaBancariaId }),
    );

    expect(conAjeno.estado).toBe(404);
  });

  it('otra cuenta no los ve', async () => {
    const ajeno = await otraCuenta.propietario.post(RUTA, datos(referenciasAjenas));

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
    expect((await otraCuenta.propietario.get(RUTA)).cuerpo).toEqual([ajeno.cuerpo]);
  });

  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    await cuenta.propietario.post(RUTA, datos());
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);

    const revision = await cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'movimientos.xlsx',
      tipoMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: exportado.cuerpo,
    });

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });

  it('para registrar hace falta el permiso de gestionar', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['bancos.movimientos.ver'],
    });

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});
