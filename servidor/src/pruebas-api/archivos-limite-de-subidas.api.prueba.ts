import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearImagenPng } from './soporte/imagenes.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Muchas subidas', usuario: 'msubidas' });
});

describe('límite de subidas de archivos', () => {
  it('la petición 31 del minuto responde 429', async () => {
    const imagen = await crearImagenPng(16, 16);
    const estados: number[] = [];

    for (let i = 0; i < 31; i++) {
      const respuesta = await cuenta.propietario.subirImagen('POST', '/api/archivos', imagen);
      estados.push(respuesta.estado);
      if (i === 30) expect(respuesta.cuerpo.error.codigo).toBe('demasiadas_subidas');
    }

    expect(estados.slice(0, 30)).toEqual(Array(30).fill(201));
    expect(estados[30]).toBe(429);
  });
});
