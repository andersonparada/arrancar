import { beforeAll, describe, expect, it } from 'vitest';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { CONTRASENA_DE_PRUEBA, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Perez', usuario: 'jperez' });
});

describe('plataforma: solo para soporte', () => {
  it('un propietario no puede usar las rutas de soporte', async () => {
    const respuesta = await cuenta.propietario.get('/api/plataforma/cuentas');

    expect(respuesta.estado).toBe(403);
  });

  it('lista las cuentas dadas de alta', async () => {
    const respuesta = await entorno.soporte.get('/api/plataforma/cuentas');

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cuerpo.map((c: { id: string }) => c.id)).toContain(cuenta.cuentaId);
  });
});

describe('alta de cuenta', () => {
  it('crea cuenta, empresa y propietario, y genera el usuario a partir del nombre', async () => {
    const respuesta = await entorno.soporte.post('/api/plataforma/cuentas', {
      nombreCuenta: 'Familia Ramírez',
      empresa: { nombre: 'Finca La Esperanza' },
      propietario: { nombres: 'Rosa', apellidos: 'Ramírez', contrasena: CONTRASENA_DE_PRUEBA },
    });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      cuenta: { nombre: 'Familia Ramírez' },
      empresa: { nombre: 'Finca La Esperanza' },
      propietario: { usuario: 'rramirez', existente: false },
    });
  });

  it('exige la contraseña cuando el propietario es nuevo', async () => {
    const respuesta = await entorno.soporte.post('/api/plataforma/cuentas', {
      nombreCuenta: 'Sin contraseña',
      empresa: { nombre: 'Finca' },
      propietario: { nombres: 'Ana', apellidos: 'Sin Clave' },
    });

    expect(respuesta.estado).toBe(400);
  });

  it('reutiliza al propietario si soporte escribe un usuario que ya existe', async () => {
    const respuesta = await entorno.soporte.post('/api/plataforma/cuentas', {
      nombreCuenta: 'Segunda cuenta de Pérez',
      empresa: { nombre: 'Parcela El Mirador' },
      propietario: { nombres: 'Otro', apellidos: 'Nombre', usuario: 'jperez' },
    });

    expect(respuesta.estado).toBe(201);
    expect(respuesta.cuerpo.propietario).toMatchObject({ usuario: 'jperez', existente: true });
  });

  it('rechaza módulos cuyas dependencias no se contrataron o no existen', async () => {
    const respuesta = await entorno.soporte.post('/api/plataforma/cuentas', {
      nombreCuenta: 'Con módulo inexistente',
      empresa: { nombre: 'Finca' },
      propietario: { nombres: 'Luis', apellidos: 'Prueba', contrasena: CONTRASENA_DE_PRUEBA },
      modulos: ['modulo_que_no_existe'],
    });

    expect(respuesta.estado).toBeGreaterThanOrEqual(400);
    expect(respuesta.estado).toBeLessThan(500);
  });
});

describe('módulos de una cuenta', () => {
  it('muestra el catálogo con core y empresas como esenciales', async () => {
    const respuesta = await entorno.soporte.get(`/api/plataforma/cuentas/${cuenta.cuentaId}/modulos`);

    const porClave = Object.fromEntries(respuesta.cuerpo.map((m: { clave: string }) => [m.clave, m]));
    expect(porClave.core).toMatchObject({ esencial: true, activo: true });
    expect(porClave.empresas).toMatchObject({ esencial: true, activo: true });
    expect(porClave.terceros).toMatchObject({ esencial: false, activo: false });
  });

  it('activa y desactiva un módulo', async () => {
    const url = `/api/plataforma/cuentas/${cuenta.cuentaId}/modulos/terceros`;

    const activado = await entorno.soporte.put(url);
    const desactivado = await entorno.soporte.delete(url);

    expect(activado.cuerpo.find((m: { clave: string }) => m.clave === 'terceros').activo).toBe(true);
    expect(desactivado.cuerpo.find((m: { clave: string }) => m.clave === 'terceros').activo).toBe(false);
  });

  it('no permite desactivar un módulo esencial', async () => {
    const respuesta = await entorno.soporte.delete(`/api/plataforma/cuentas/${cuenta.cuentaId}/modulos/empresas`);

    expect(respuesta.estado).toBe(422);
  });
});

describe('cuentas suspendidas y bitácora', () => {
  it('registra en la bitácora cuando soporte entra a la empresa de un cliente', async () => {
    await entorno.soporte.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });

    const bitacora = await entorno.soporte.get('/api/plataforma/bitacora');

    expect(bitacora.cuerpo[0]).toMatchObject({
      accion: 'entrada_empresa',
      empresaNombre: 'Rancho de Perez',
      usuarioNombre: 'Soporte Arrancar',
    });
  });

  it('un propietario de una cuenta suspendida ya no puede trabajar en su empresa', async () => {
    const suspendida = await darDeAltaCuenta(entorno, { nombre: 'Morales', usuario: 'lmorales' });

    const cambio = await entorno.soporte.patch(`/api/plataforma/cuentas/${suspendida.cuentaId}`, { activa: false });
    const sesion = await suspendida.propietario.get('/api/sesion');

    expect(cambio.estado).toBe(204);
    expect(sesion.cuerpo.empresa).toBeNull();
    expect(sesion.cuerpo.empresasDisponibles).toEqual([]);
  });
});
