import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const NIT_VALIDO = '12345679';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Quiroa', usuario: 'hquiroa' });
});

describe('empresas de la cuenta', () => {
  it('lista la empresa creada con la cuenta', async () => {
    const respuesta = await cuenta.propietario.get('/api/empresas');

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo).toEqual([
      expect.objectContaining({ id: cuenta.empresaId, nombre: 'Rancho de Quiroa', monedaBase: 'GTQ', activa: true }),
    ]);
  });

  it('crea una empresa y quien la crea recibe acceso a ella', async () => {
    const creada = await cuenta.propietario.post('/api/empresas', { nombre: 'Parcela Los Pinos', nit: NIT_VALIDO });
    const sesion = await cuenta.propietario.get('/api/sesion');

    expect(creada.estado).toBe(201);
    expect(creada.cuerpo).toMatchObject({ nombre: 'Parcela Los Pinos', nit: NIT_VALIDO });
    expect(sesion.cuerpo.empresasDisponibles.map((e: { id: string }) => e.id)).toContain(creada.cuerpo.id);
  });

  it('valida el dígito verificador del NIT', async () => {
    const respuesta = await cuenta.propietario.post('/api/empresas', { nombre: 'NIT malo', nit: '12345678' });

    expect(respuesta.estado).toBe(400);
  });

  it('obtiene y actualiza una empresa, con teléfono y correo normalizados', async () => {
    const actualizada = await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}`, {
      nombre: 'Rancho El Quiroa',
      telefono: '5555-1234',
      correo: 'Oficina@Quiroa.GT',
    });
    const obtenida = await cuenta.propietario.get(`/api/empresas/${cuenta.empresaId}`);

    expect(actualizada.estado).toBe(200);
    expect(obtenida.cuerpo).toMatchObject({
      nombre: 'Rancho El Quiroa',
      telefono: '55551234',
      correo: 'oficina@quiroa.gt',
    });
  });

  it('rechaza un teléfono que no es un número', async () => {
    const respuesta = await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}`, {
      nombre: 'Rancho El Quiroa',
      telefono: 'llamar al capataz',
    });

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('telefono_invalido');
  });

  it('no permite desactivar la empresa con la que se está trabajando', async () => {
    const respuesta = await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}`, {
      nombre: 'Rancho El Quiroa',
      activa: false,
    });

    expect(respuesta.estado).toBe(422);
  });

  it('responde 404 para una empresa que no existe', async () => {
    const respuesta = await cuenta.propietario.get(`/api/empresas/${crypto.randomUUID()}`);

    expect(respuesta.estado).toBe(404);
  });
});
