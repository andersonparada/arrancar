import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const ZONA_HORARIA = 'core.regional.zona_horaria';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

/** La configuración es solo de soporte; el navegador de soporte necesita la empresa activa. */
async function variable(clave: string) {
  const respuesta = await entorno.soporte.get('/api/configuracion');
  return respuesta.cuerpo.find((v: { clave: string }) => v.clave === clave);
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Estrada', usuario: 'restrada' });
  await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
});

describe('acceso a la configuración', () => {
  it('el propietario de la cuenta no puede ver ni cambiar la configuración', async () => {
    const ver = await cuenta.propietario.get('/api/configuracion');
    const cambiar = await cuenta.propietario.put(`/api/configuracion/${ZONA_HORARIA}`, {
      nivel: 'cuenta',
      valor: 'America/Mexico_City',
    });

    expect(ver.estado).toBe(403);
    expect(cambiar.estado).toBe(403);
  });

  it('el superacceso sí puede verla y cambiarla', async () => {
    const respuesta = await entorno.soporte.get('/api/configuracion');

    expect(respuesta.estado).toBe(200);
  });
});

describe('configuración por niveles', () => {
  it('solo lista variables que la cuenta o la empresa pueden cambiar', async () => {
    const respuesta = await entorno.soporte.get('/api/configuracion');

    const claves = respuesta.cuerpo.map((v: { clave: string }) => v.clave);
    expect(claves).toContain(ZONA_HORARIA);
    expect(claves).not.toContain('core.interfaz.nombre_aplicacion');
  });

  it('sin cambios usa el valor predeterminado', async () => {
    expect(await variable(ZONA_HORARIA)).toMatchObject({ efectivo: 'America/Guatemala', origen: 'predeterminado' });
  });

  it('el valor de la empresa gana al de la cuenta', async () => {
    await entorno.soporte.put(`/api/configuracion/${ZONA_HORARIA}`, {
      nivel: 'cuenta',
      valor: 'America/Mexico_City',
    });
    const conCuenta = await variable(ZONA_HORARIA);
    await entorno.soporte.put(`/api/configuracion/${ZONA_HORARIA}`, {
      nivel: 'empresa',
      valor: 'America/El_Salvador',
    });
    const conEmpresa = await variable(ZONA_HORARIA);

    expect(conCuenta).toMatchObject({ efectivo: 'America/Mexico_City', origen: 'cuenta' });
    expect(conEmpresa).toMatchObject({ efectivo: 'America/El_Salvador', origen: 'empresa' });
  });

  it('restablecer la empresa vuelve al valor de la cuenta', async () => {
    const respuesta = await entorno.soporte.delete(`/api/configuracion/${ZONA_HORARIA}?nivel=empresa`);

    expect(respuesta.estado).toBe(204);
    expect(await variable(ZONA_HORARIA)).toMatchObject({ efectivo: 'America/Mexico_City', origen: 'cuenta' });
  });

  it('los valores públicos llegan con la sesión', async () => {
    const sesion = await cuenta.propietario.get('/api/sesion');

    expect(sesion.cuerpo.configuracion[ZONA_HORARIA]).toBe('America/Mexico_City');
  });

  it('rechaza un valor con el tipo equivocado', async () => {
    const respuesta = await entorno.soporte.put(`/api/configuracion/${ZONA_HORARIA}`, {
      nivel: 'cuenta',
      valor: 42,
    });

    expect(respuesta.estado).toBe(400);
  });

  it('no permite fijar desde la cuenta una variable que es solo de la instalación', async () => {
    const respuesta = await entorno.soporte.put('/api/configuracion/core.interfaz.nombre_aplicacion', {
      nivel: 'cuenta',
      valor: 'Otra app',
    });

    expect(respuesta.estado).toBe(422);
  });

  it('responde 404 para una variable que no existe', async () => {
    const respuesta = await entorno.soporte.put('/api/configuracion/core.no.existe', { nivel: 'cuenta', valor: 1 });

    expect(respuesta.estado).toBe(404);
  });
});
