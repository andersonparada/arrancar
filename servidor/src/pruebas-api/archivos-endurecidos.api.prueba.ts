import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearImagenPng, type Imagen } from './soporte/imagenes.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Archivos duros', usuario: 'aduros' });
});

const subir = (imagen: Imagen) => cuenta.propietario.subirImagen('POST', '/api/archivos', imagen);

describe('fotos: el formato real manda, no el tipo que dice el cliente', () => {
  it('un SVG presentado como image/png se rechaza', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>alert(1)</script></svg>';

    const respuesta = await subir({ nombreArchivo: 'foto.png', tipoMime: 'image/png', contenido: Buffer.from(svg) });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('formato_de_imagen_no_aceptado');
  });

  it.each(['gif', 'tiff', 'avif'] as const)('%s se rechaza aunque se anuncie como JPEG', async (formato) => {
    const base = { create: { width: 32, height: 32, channels: 3 as const, background: '#123456' } };
    const contenido = await sharp(base).toFormat(formato).toBuffer();

    const respuesta = await subir({ nombreArchivo: `foto.${formato}`, tipoMime: 'image/jpeg', contenido });

    expect(respuesta.cuerpo.error.codigo).toBe('formato_de_imagen_no_aceptado');
  });

  it('una foto HEIC se rechaza con la ayuda para convertirla', async () => {
    const contenido = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypheic'), Buffer.alloc(16)]);

    const respuesta = await subir({ nombreArchivo: 'IMG_0001.heic', tipoMime: 'image/heic', contenido });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error).toMatchObject({ codigo: 'foto_heic_no_aceptada' });
    expect(respuesta.cuerpo.error.mensaje).toContain('Más compatible');
  });

  it('un PNG de 20000 x 20000 se rechaza por tener demasiados píxeles', async () => {
    const contenido = await sharp({
      create: { width: 20000, height: 20000, channels: 3, background: '#646464' },
      limitInputPixels: false,
    })
      .png({ compressionLevel: 9 })
      .toBuffer();

    const respuesta = await subir({ nombreArchivo: 'enorme.png', tipoMime: 'image/png', contenido });

    expect(respuesta.estado).toBe(413);
    expect(respuesta.cuerpo.error.codigo).toBe('imagen_demasiado_grande');
  });

  it('una foto normal sigue funcionando y se guarda como WebP', async () => {
    const respuesta = await subir(await crearImagenPng(300, 200));

    expect(respuesta.estado).toBe(201);
  });
});
