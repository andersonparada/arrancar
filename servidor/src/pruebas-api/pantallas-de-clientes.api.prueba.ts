import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

const persona = (nombres: string, apellidos: string) => ({ tipo: 'individual', nombres, apellidos });

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Monterroso', usuario: 'amonterroso', modulos: ['terceros'] });
});

describe('alta completa de un cliente o proveedor', () => {
  it('lo registra con su papel y sus contactos en un solo paso', async () => {
    const alta = await cuenta.propietario.post('/api/terceros', {
      ...persona('Julio', 'Acopiador'),
      papel: { tipo: 'cliente', clase: 'intermediario' },
      contactos: [{ nombre: 'Marta', cargo: 'Bodega', telefono: '4444-1234' }],
    });
    const ficha = await cuenta.propietario.get(`/api/terceros/${alta.cuerpo.id}`);

    expect(alta.estado).toBe(201);
    expect(ficha.cuerpo.cliente).toMatchObject({ clase: 'intermediario', activo: true });
    expect(ficha.cuerpo.contactos).toEqual([expect.objectContaining({ nombre: 'Marta', telefono: '44441234' })]);
  });

  it('si un contacto no es válido no registra nada', async () => {
    const alta = await cuenta.propietario.post('/api/terceros', {
      ...persona('Nadie', 'Guardado'),
      contactos: [{ nombre: '' }],
    });
    const listado = await cuenta.propietario.get('/api/terceros?texto=Nadie');

    expect(alta.estado).toBe(400);
    expect(listado.cuerpo).toEqual([]);
  });

  it('entrar ya como proveedor exige también el permiso de proveedores', async () => {
    const vendedor = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Clientes',
      permisos: ['terceros.ver', 'terceros.crear', 'terceros.editar', 'clientes.crear'],
    });

    const comoCliente = await vendedor.post('/api/terceros', {
      ...persona('Ana', 'Compradora'),
      papel: { tipo: 'cliente', clase: 'directo' },
    });
    const comoProveedor = await vendedor.post('/api/terceros', {
      ...persona('Luis', 'Vendedor'),
      papel: { tipo: 'proveedor' },
    });

    expect(comoCliente.estado).toBe(201);
    expect(comoProveedor.estado).toBe(403);
  });
});

describe('listados de clientes y proveedores', () => {
  it('traen la clase del cliente y la categoría del proveedor', async () => {
    const categoria = await cuenta.propietario.post('/api/proveedores/categorias', { nombre: 'Veterinaria' });
    await cuenta.propietario.post('/api/terceros', {
      ...persona('Doctora', 'Vacas'),
      papel: { tipo: 'proveedor', categoriaId: categoria.cuerpo.id },
    });

    const clientes = await cuenta.propietario.get('/api/terceros?papel=cliente&texto=Julio');
    const proveedores = await cuenta.propietario.get('/api/terceros?papel=proveedor&texto=Doctora');

    expect(clientes.cuerpo[0]).toMatchObject({ cliente: { clase: 'intermediario' }, proveedor: null });
    expect(proveedores.cuerpo[0]).toMatchObject({ proveedor: { categoriaNombre: 'Veterinaria', activo: true } });
  });
});

describe('buscar contacto', () => {
  it('encuentra al cliente y a sus personas de contacto por nombre o teléfono', async () => {
    const porNombre = await cuenta.propietario.get('/api/contactos?texto=Marta');
    const porTelefono = await cuenta.propietario.get('/api/contactos?texto=4444-12');

    expect(porNombre.cuerpo).toEqual([
      expect.objectContaining({ terceroNombre: 'Julio Acopiador', contactoNombre: 'Marta', esCliente: true }),
    ]);
    expect(porTelefono.cuerpo.map((c: { contactoNombre: string }) => c.contactoNombre)).toContain('Marta');
  });

  it('al buscar por el nombre del cliente muestra también a sus contactos', async () => {
    const respuesta = await cuenta.propietario.get('/api/contactos?texto=Acopiador');

    expect(respuesta.cuerpo.map((c: { contactoNombre: string | null }) => c.contactoNombre)).toEqual([null, 'Marta']);
  });

  it('pide al menos dos caracteres', async () => {
    expect((await cuenta.propietario.get('/api/contactos?texto=a')).estado).toBe(400);
  });
});
