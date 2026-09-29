import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearImagenPng } from './soporte/imagenes.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otra: CuentaDePrueba;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Dueños de archivos', usuario: 'aduenos', modulos: ['terceros'] });
  otra = await darDeAltaCuenta(entorno, { nombre: 'Otra de archivos', usuario: 'aotra', modulos: ['terceros'] });
});

async function subirFoto(): Promise<string> {
  const subida = await cuenta.propietario.subirImagen('POST', '/api/archivos', await crearImagenPng(100, 80));
  expect(subida.estado).toBe(201);
  return subida.cuerpo.id;
}

async function darleDueno(archivoId: string, clase: 'imagen' | 'documento'): Promise<void> {
  await comoPropietario(`update core.archivos set recurso_dueno = 'bancos.conciliaciones', clase = $2 where id = $1`, [
    archivoId,
    clase,
  ]);
}

const crearCliente = (fotoArchivoId: string) =>
  cuenta.propietario.post('/api/terceros', { tipo: 'individual', nombres: 'Rosa', apellidos: 'Díaz', fotoArchivoId });

describe('archivos con dueño y de otra empresa', () => {
  it('una foto libre se sirve y sirve de foto de un cliente', async () => {
    const id = await subirFoto();

    expect((await cuenta.propietario.get(`/api/archivos/${id}`)).estado).toBe(200);
    expect((await crearCliente(id)).estado).toBe(201);
  });

  it('la foto de otra empresa no se sirve: 404', async () => {
    const id = await subirFoto();

    expect((await otra.propietario.get(`/api/archivos/${id}`)).estado).toBe(404);
  });

  it('un cliente no puede usar la foto de otra empresa: 400', async () => {
    const id = await subirFoto();

    const respuesta = await otra.propietario.post('/api/terceros', {
      tipo: 'individual',
      nombres: 'Ana',
      apellidos: 'Gómez',
      fotoArchivoId: id,
    });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('foto_no_valida');
  });

  it.each(['imagen', 'documento'] as const)(
    'un archivo %s con dueño no se sirve en /archivos/:id: 404',
    async (clase) => {
      const id = await subirFoto();
      await darleDueno(id, clase);

      expect((await cuenta.propietario.get(`/api/archivos/${id}`)).estado).toBe(404);
      expect((await cuenta.propietario.get(`/api/archivos/${id}?variante=miniatura`)).estado).toBe(404);
    },
  );

  it.each(['imagen', 'documento'] as const)('un cliente con un archivo %s con dueño de foto: 400', async (clase) => {
    const id = await subirFoto();
    await darleDueno(id, clase);

    const respuesta = await crearCliente(id);

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('foto_no_valida');
  });

  it('editar un cliente con una foto inexistente: 400', async () => {
    const creado = await cuenta.propietario.post('/api/terceros', {
      tipo: 'individual',
      nombres: 'Luz',
      apellidos: 'Paz',
    });

    const respuesta = await cuenta.propietario.put(`/api/terceros/${creado.cuerpo.id}`, {
      tipo: 'individual',
      nombres: 'Luz',
      apellidos: 'Paz',
      fotoArchivoId: crypto.randomUUID(),
      activo: true,
    });

    expect(respuesta.estado).toBe(400);
  });
});
