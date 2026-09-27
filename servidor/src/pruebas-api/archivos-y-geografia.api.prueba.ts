import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearArchivoDeTexto, crearImagenPng } from './soporte/imagenes.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Cifuentes', usuario: 'pcifuentes' });
});

describe('imágenes', () => {
  it('guarda la imagen como WebP y la entrega en tamaño original y en miniatura', async () => {
    const subida = await cuenta.propietario.subirImagen('POST', '/api/archivos', await crearImagenPng(800, 600));
    const original = await cuenta.propietario.get(`/api/archivos/${subida.cuerpo.id}`);
    const miniatura = await cuenta.propietario.get(`/api/archivos/${subida.cuerpo.id}?variante=miniatura`);

    expect(subida.estado).toBe(201);
    expect(subida.cuerpo).toMatchObject({ ancho: 800, alto: 600 });
    expect(original.cabeceras['content-type']).toBe('image/webp');
    expect(miniatura.estado).toBe(200);
  });

  it('achica las imágenes grandes a 1600 píxeles por lado', async () => {
    const subida = await cuenta.propietario.subirImagen('POST', '/api/archivos', await crearImagenPng(3200, 1600));

    expect(subida.cuerpo).toMatchObject({ ancho: 1600, alto: 800 });
  });

  it('rechaza archivos que no son imágenes', async () => {
    const respuesta = await cuenta.propietario.subirImagen('POST', '/api/archivos', crearArchivoDeTexto());

    expect(respuesta.estado).toBe(400);
  });

  it('responde 404 para una imagen que no existe', async () => {
    const respuesta = await cuenta.propietario.get(`/api/archivos/${crypto.randomUUID()}`);

    expect(respuesta.estado).toBe(404);
  });
});

describe('departamentos y municipios de Guatemala', () => {
  it('lista los 22 departamentos', async () => {
    const respuesta = await cuenta.propietario.get('/api/geografia/departamentos');

    expect(respuesta.cuerpo).toHaveLength(22);
    expect(respuesta.cuerpo[0]).toMatchObject({ codigo: '01', nombre: 'Guatemala' });
  });

  it('lista los municipios de un departamento', async () => {
    const respuesta = await cuenta.propietario.get('/api/geografia/departamentos/01/municipios');

    expect(respuesta.cuerpo).toHaveLength(17);
    expect(respuesta.cuerpo.map((m: { nombre: string }) => m.nombre)).toContain('Mixco');
  });

  it('rechaza códigos de departamento mal escritos', async () => {
    const respuesta = await cuenta.propietario.get('/api/geografia/departamentos/1/municipios');

    expect(respuesta.estado).toBe(400);
  });
});
