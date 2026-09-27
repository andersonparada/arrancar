import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearArchivoDeTexto, crearImagenPng } from './soporte/imagenes.js';

const APARIENCIA_ORIGINAL = { nombreAplicacion: 'Arrancar', colorPrincipal: '#1f4d2c', colorAcento: '#e9c46a' };

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Velasquez', usuario: 'cvelasquez' });
});

afterAll(async () => {
  await entorno.soporte.delete('/api/plataforma/apariencia/logo');
});

describe('apariencia de la instalación', () => {
  it('cualquiera la puede leer, incluso sin sesión', async () => {
    const respuesta = await entorno.nuevoCliente().get('/api/apariencia');

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toEqual({ ...APARIENCIA_ORIGINAL, urlLogo: null });
  });

  it('solo soporte la puede cambiar', async () => {
    const respuesta = await cuenta.propietario.put('/api/plataforma/apariencia', APARIENCIA_ORIGINAL);

    expect(respuesta.estado).toBe(403);
  });

  it('soporte cambia nombre y colores, y puede restablecerlos', async () => {
    const cambiada = await entorno.soporte.put('/api/plataforma/apariencia', {
      nombreAplicacion: 'Mi Rancho',
      colorPrincipal: '#1D3557',
      colorAcento: '#F1FAEE',
    });
    const restablecida = await entorno.soporte.delete('/api/plataforma/apariencia');

    expect(cambiada.cuerpo).toMatchObject({ nombreAplicacion: 'Mi Rancho', colorPrincipal: '#1d3557', colorAcento: '#f1faee' });
    expect(restablecida.cuerpo).toMatchObject(APARIENCIA_ORIGINAL);
  });

  it('rechaza colores que no tienen el formato #RRGGBB', async () => {
    const respuesta = await entorno.soporte.put('/api/plataforma/apariencia', { ...APARIENCIA_ORIGINAL, colorAcento: 'rojo' });

    expect(respuesta.estado).toBe(400);
  });
});

describe('logo de la instalación', () => {
  it('sin logo propio, pedir el logo responde 404', async () => {
    const respuesta = await entorno.nuevoCliente().get('/api/apariencia/logo');

    expect(respuesta.estado).toBe(404);
  });

  it('al subir un logo se convierte en PNG y la apariencia apunta a él', async () => {
    const subida = await entorno.soporte.subirImagen('PUT', '/api/plataforma/apariencia/logo', await crearImagenPng());
    const logo = await entorno.nuevoCliente().get(subida.cuerpo.urlLogo);

    expect(subida.estado).toBe(200);
    expect(subida.cuerpo.urlLogo).toMatch(/^\/api\/apariencia\/logo\?v=/);
    expect(logo.estado).toBe(200);
    expect(logo.cabeceras['content-type']).toBe('image/png');
  });

  it('rechaza archivos que no son imágenes', async () => {
    const respuesta = await entorno.soporte.subirImagen('PUT', '/api/plataforma/apariencia/logo', crearArchivoDeTexto());

    expect(respuesta.estado).toBe(400);
  });

  it('al quitar el logo se vuelve al predeterminado', async () => {
    const respuesta = await entorno.soporte.delete('/api/plataforma/apariencia/logo');

    expect(respuesta.cuerpo.urlLogo).toBeNull();
  });
});
