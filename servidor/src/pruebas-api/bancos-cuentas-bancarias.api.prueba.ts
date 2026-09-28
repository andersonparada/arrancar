import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/bancos/cuentas-bancarias';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

/** Lo que el registro necesita elegir, registrado en la cuenta del usuario. */
async function crearReferencias(usuario: ClienteApi) {
  const banco = await usuario.post('/api/bancos/bancos', {
    nombre: 'Registro de prueba',
    observaciones: 'Una nota de prueba.',
    activo: true,
  });
  return { bancoId: banco.cuerpo.id as string };
}

let referencias: Awaited<ReturnType<typeof crearReferencias>>;
let referenciasAjenas: Awaited<ReturnType<typeof crearReferencias>>;

const datos = (cambios: Record<string, unknown> = {}) => ({
  nombre: 'Registro de prueba',
  numero: 'Registro de prueba',
  tipo: 'monetaria',
  observaciones: 'Una nota de prueba.',
  activo: true,
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

describe('cuentas bancarias por API', () => {
  it('se registran, se listan y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(
      `${RUTA}/${id}`,
      datos({ nombre: 'Registro cambiado', numero: 'Registro cambiado' }),
    );

    expect(creado.estado).toBe(201);
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect((await cuenta.propietario.get(RUTA)).cuerpo).toEqual([cambiado.cuerpo]);
    expect(cambiado.cuerpo.nombre).toBe('Registro cambiado');
  });

  it('se inactivan sin perder sus datos', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const inactivo = await cuenta.propietario.put(`${RUTA}/${creado.cuerpo.id}`, datos({ activo: false }));

    expect(inactivo.cuerpo).toEqual({ ...creado.cuerpo, activo: false });
  });

  it('no acepta un banco de otra cuenta', async () => {
    const conAjeno = await cuenta.propietario.post(RUTA, datos({ bancoId: referenciasAjenas.bancoId }));

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
      nombreArchivo: 'cuentas-bancarias.xlsx',
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
      permisos: ['bancos.cuentas-bancarias.ver'],
    });

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});
