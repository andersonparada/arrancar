import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

function registrarPersona(nombres: string, apellidos: string, extra: Record<string, unknown> = {}) {
  return cuenta.propietario.post('/api/terceros', { tipo: 'individual', nombres, apellidos, ...extra });
}

async function buscar(consulta: string) {
  const respuesta = await cuenta.propietario.get(`/api/terceros?${consulta}`);
  return respuesta.cuerpo.map((t: { nombreMostrar: string }) => t.nombreMostrar);
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Monterroso', usuario: 'amonterroso', modulos: ['terceros'] });
});

describe('módulo inactivo', () => {
  it('una cuenta sin el módulo no puede usar sus rutas', async () => {
    const sinModulo = await darDeAltaCuenta(entorno, { nombre: 'Sin Modulo', usuario: 'sinmodulo' });

    const respuesta = await sinModulo.propietario.get('/api/terceros');

    expect(respuesta.estado).toBe(403);
  });
});

describe('registro de terceros', () => {
  it('registra una persona con solo el nombre', async () => {
    const respuesta = await registrarPersona('Juan', 'Pérez');

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      tipo: 'individual',
      nombreMostrar: 'Juan Pérez',
      nit: null,
      activo: true,
    });
  });

  it('muestra el nombre comercial de una empresa por encima de la razón social', async () => {
    const respuesta = await cuenta.propietario.post('/api/terceros', {
      tipo: 'juridica',
      razonSocial: 'Tabacalera Centroamericana, S.A.',
      nombreComercial: 'Tabacalera',
      nit: '12345679',
    });

    expect(respuesta.cuerpo.nombreMostrar).toBe('Tabacalera');
  });

  it('exige el nombre según el tipo de tercero', async () => {
    const sinNombres = await cuenta.propietario.post('/api/terceros', {
      tipo: 'individual',
      apellidos: 'Solo Apellido',
    });
    const sinRazonSocial = await cuenta.propietario.post('/api/terceros', { tipo: 'juridica' });

    expect(sinNombres.estado).toBe(400);
    expect(sinRazonSocial.estado).toBe(400);
  });

  it('valida el NIT y el DPI', async () => {
    const nitMalo = await registrarPersona('Nit', 'Malo', { nit: '12345678' });
    const dpiMalo = await registrarPersona('Dpi', 'Malo', { dpi: '1234567890123' });

    expect(nitMalo.estado).toBe(400);
    expect(dpiMalo.estado).toBe(400);
  });

  it('no permite repetir un NIT, pero sí varios consumidores finales', async () => {
    const nitRepetido = await registrarPersona('Otro', 'Con Mismo Nit', { nit: '12345679' });
    const primerCf = await registrarPersona('Tomasa', 'Ajanel', { nit: 'CF' });
    const segundoCf = await registrarPersona('Bernabé', 'Cutzal', { nit: 'CF' });

    expect(nitRepetido.estado).toBe(409);
    expect(primerCf.estado).toBe(201);
    expect(segundoCf.estado).toBe(201);
  });

  it('avisa de un posible duplicado y lo registra si se confirma', async () => {
    const aviso = await registrarPersona('Juan', 'Perez');
    const confirmado = await registrarPersona('Juan', 'Perez', { confirmarDuplicado: true });

    expect(aviso.estado).toBe(409);
    expect(aviso.cuerpo.error.detalles.duplicados[0]).toMatchObject({ nombreMostrar: 'Juan Pérez' });
    expect(confirmado.estado).toBe(201);
  });
});

describe('búsqueda', () => {
  it('encuentra por nombre, por NIT y por teléfono', async () => {
    await registrarPersona('Rosa', 'Xitumul', { telefono: '4455-6677' });

    expect(await buscar('texto=Xitumul')).toEqual(['Rosa Xitumul']);
    expect(await buscar('texto=12345679')).toEqual(['Tabacalera']);
    expect(await buscar('texto=4455')).toEqual(['Rosa Xitumul']);
  });
});

describe('papeles de cliente y proveedor', () => {
  it('asigna el papel de cliente con su clase y filtra por papel', async () => {
    const tercero = await registrarPersona('Mario', 'Acopiador');

    const asignado = await cuenta.propietario.put(`/api/terceros/${tercero.cuerpo.id}/cliente`, {
      clase: 'intermediario',
    });

    expect(asignado.estado).toBe(200);
    expect(asignado.cuerpo).toMatchObject({ clase: 'intermediario', activo: true });
    expect(await buscar('papel=cliente')).toEqual(['Mario Acopiador']);
  });

  it('asigna el papel de proveedor con una categoría de la cuenta', async () => {
    const categoria = await cuenta.propietario.post('/api/proveedores/categorias', { nombre: 'Veterinario' });
    const tercero = await registrarPersona('Doctora', 'Veterinaria');

    const asignado = await cuenta.propietario.put(`/api/terceros/${tercero.cuerpo.id}/proveedor`, {
      categoriaId: categoria.cuerpo.id,
    });
    const ficha = await cuenta.propietario.get(`/api/terceros/${tercero.cuerpo.id}`);

    expect(categoria.estado).toBe(201);
    expect(asignado.estado).toBe(200);
    expect(ficha.cuerpo.proveedor).toMatchObject({ categoriaId: categoria.cuerpo.id });
  });

  it('quitar un papel no borra al tercero', async () => {
    const tercero = await registrarPersona('Cliente', 'Temporal');
    await cuenta.propietario.put(`/api/terceros/${tercero.cuerpo.id}/cliente`, { clase: 'directo' });

    const quitado = await cuenta.propietario.delete(`/api/terceros/${tercero.cuerpo.id}/cliente`);
    const ficha = await cuenta.propietario.get(`/api/terceros/${tercero.cuerpo.id}`);

    expect(quitado.estado).toBe(204);
    expect(ficha.estado).toBe(200);
  });

  it('no asigna papeles a un tercero inactivo', async () => {
    const tercero = await registrarPersona('Tercero', 'Inactivo');
    await cuenta.propietario.put(`/api/terceros/${tercero.cuerpo.id}`, {
      tipo: 'individual',
      nombres: 'Tercero',
      apellidos: 'Inactivo',
      activo: false,
    });

    const respuesta = await cuenta.propietario.put(`/api/terceros/${tercero.cuerpo.id}/cliente`, { clase: 'directo' });

    expect(respuesta.estado).toBe(422);
  });
});

describe('contactos', () => {
  it('agrega, cambia y elimina contactos de un tercero', async () => {
    const tercero = await cuenta.propietario.post('/api/terceros', {
      tipo: 'juridica',
      razonSocial: 'Rastro Municipal',
    });
    const url = `/api/terceros/${tercero.cuerpo.id}/contactos`;

    const creado = await cuenta.propietario.post(url, { nombre: 'Encargado de compras', telefono: '5000-0000' });
    const cambiado = await cuenta.propietario.put(`${url}/${creado.cuerpo.id}`, { nombre: 'Jefe de compras' });
    const lista = await cuenta.propietario.get(url);
    const eliminado = await cuenta.propietario.delete(`${url}/${creado.cuerpo.id}`);

    expect(creado.estado).toBe(201);
    expect(cambiado.estado).toBe(200);
    expect(lista.cuerpo).toEqual([expect.objectContaining({ nombre: 'Jefe de compras' })]);
    expect(eliminado.estado).toBe(204);
  });
});

describe('permisos del módulo', () => {
  it('quien solo puede ver no puede registrar ni asignar papeles', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector',
      apellidos: 'Terceros',
      permisos: ['terceros.ver'],
    });
    const tercero = await registrarPersona('Para', 'Permisos');

    expect((await lector.get('/api/terceros')).estado).toBe(200);
    expect((await lector.post('/api/terceros', { tipo: 'individual', nombres: 'No' })).estado).toBe(403);
    expect((await lector.put(`/api/terceros/${tercero.cuerpo.id}/cliente`, { clase: 'directo' })).estado).toBe(403);
  });
});
