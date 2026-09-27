import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

function registrar(datos: Record<string, unknown>) {
  return cuenta.propietario.post('/api/terceros', { tipo: 'individual', ...datos });
}

async function nombresListados(consulta: string): Promise<string[]> {
  const respuesta = await cuenta.propietario.get(`/api/terceros?${consulta}`);
  return respuesta.cuerpo.map((tercero: { nombreMostrar: string }) => tercero.nombreMostrar);
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Sagastume', usuario: 'lsagastume', modulos: ['terceros'] });
});

describe('el módulo se presenta como Clientes', () => {
  it('soporte lo ve con ese nombre en el catálogo de módulos', async () => {
    const modulos = await entorno.soporte.get('/api/plataforma/modulos');

    expect(modulos.cuerpo.find((modulo: { clave: string }) => modulo.clave === 'terceros')).toMatchObject({
      nombre: 'Clientes',
    });
  });

  it('ya no tiene el papel de trabajador (pasa a planilla)', async () => {
    const tercero = await registrar({ nombres: 'Pedro', apellidos: 'Jornalero' });
    const permisos = await cuenta.propietario.get('/api/permisos');

    const asignar = await cuenta.propietario.put(`/api/terceros/${tercero.cuerpo.id}/trabajador`, { cargo: 'Vaquero' });

    expect(asignar.estado).toBe(404);
    expect(JSON.stringify(permisos.cuerpo)).not.toContain('trabajadores');
  });
});

describe('datos de contacto normalizados', () => {
  it('guarda teléfono y WhatsApp sin separadores y el correo en minúsculas', async () => {
    const respuesta = await registrar({
      nombres: 'Lucía',
      apellidos: 'Chen',
      telefono: '5555-1234',
      whatsapp: '+502 4444 5555',
      correo: 'Lucia.Chen@Correo.GT',
    });

    expect(respuesta.cuerpo).toMatchObject({
      telefono: '55551234',
      whatsapp: '+50244445555',
      correo: 'lucia.chen@correo.gt',
    });
  });

  it('encuentra por teléfono aunque se escriba con guion', async () => {
    expect(await nombresListados('texto=5555-12')).toEqual(['Lucía Chen']);
  });

  it('rechaza un teléfono que no es un número', async () => {
    const respuesta = await registrar({ nombres: 'Sin', apellidos: 'Numero', telefono: 'no tiene' });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('telefono_invalido');
  });
});

describe('filtro por estado', () => {
  it('activo=false muestra solo los inactivos y activo=true solo los activos', async () => {
    const inactivo = await registrar({ nombres: 'Ramiro', apellidos: 'Inactivo' });
    await cuenta.propietario.put(`/api/terceros/${inactivo.cuerpo.id}`, {
      tipo: 'individual',
      nombres: 'Ramiro',
      apellidos: 'Inactivo',
      activo: false,
    });

    expect(await nombresListados('activo=false')).toEqual(['Ramiro Inactivo']);
    expect(await nombresListados('activo=true')).not.toContain('Ramiro Inactivo');
  });

  it('inactivar un tercero inactiva también sus papeles', async () => {
    const tercero = await registrar({ nombres: 'Olga', apellidos: 'Compradora' });
    await cuenta.propietario.put(`/api/terceros/${tercero.cuerpo.id}/cliente`, { clase: 'directo' });

    await cuenta.propietario.put(`/api/terceros/${tercero.cuerpo.id}`, {
      tipo: 'individual',
      nombres: 'Olga',
      apellidos: 'Compradora',
      activo: false,
    });
    const ficha = await cuenta.propietario.get(`/api/terceros/${tercero.cuerpo.id}`);

    expect(ficha.cuerpo.cliente).toMatchObject({ clase: 'directo', activo: false });
  });
});

describe('contactos', () => {
  it('no se puede cambiar el contacto de un tercero usando la dirección de otro', async () => {
    const acopiador = await cuenta.propietario.post('/api/terceros', { tipo: 'juridica', razonSocial: 'Acopio Norte' });
    const otro = await cuenta.propietario.post('/api/terceros', { tipo: 'juridica', razonSocial: 'Agroquímicos Sur' });
    const contacto = await cuenta.propietario.post(`/api/terceros/${acopiador.cuerpo.id}/contactos`, {
      nombre: 'Encargada de bodega',
    });

    const respuesta = await cuenta.propietario.put(`/api/terceros/${otro.cuerpo.id}/contactos/${contacto.cuerpo.id}`, {
      nombre: 'Cambio indebido',
    });

    expect(respuesta.estado).toBe(404);
  });

  it('un contacto necesita nombre', async () => {
    const tercero = await cuenta.propietario.post('/api/terceros', { tipo: 'juridica', razonSocial: 'Rastro Central' });

    const respuesta = await cuenta.propietario.post(`/api/terceros/${tercero.cuerpo.id}/contactos`, { nombre: '  ' });

    expect(respuesta.estado).toBe(400);
  });
});

describe('categorías de proveedor', () => {
  it('se crean, se cambian y no se repiten en la cuenta', async () => {
    const creada = await cuenta.propietario.post('/api/proveedores/categorias', { nombre: 'Transporte' });
    const repetida = await cuenta.propietario.post('/api/proveedores/categorias', { nombre: 'Transporte' });
    const cambiada = await cuenta.propietario.put(`/api/proveedores/categorias/${creada.cuerpo.id}`, {
      nombre: 'Fletes',
      activo: false,
    });

    expect(creada.estado).toBe(201);
    expect(repetida.estado).toBe(409);
    expect(cambiada.cuerpo).toEqual({ id: creada.cuerpo.id, nombre: 'Fletes', activo: false });
  });

  it('no se puede asignar a un proveedor una categoría que no existe', async () => {
    const tercero = await registrar({ nombres: 'Mario', apellidos: 'Fletero' });

    const respuesta = await cuenta.propietario.put(`/api/terceros/${tercero.cuerpo.id}/proveedor`, {
      categoriaId: crypto.randomUUID(),
    });

    expect(respuesta.estado).toBe(404);
  });
});
