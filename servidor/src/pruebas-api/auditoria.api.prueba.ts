import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { CONTRASENA_DE_PRUEBA, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

interface Auditado {
  recurso: string;
  accion: string;
  registro_id: string;
  usuario_id: string | null;
  anterior: Record<string, unknown> | null;
}

/** La auditoría de la cuenta, leída como propietario de la base (la app solo puede agregar). */
async function auditoriaDeLaCuenta(): Promise<Auditado[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  const { rows } = await conexion.query<Auditado>(
    'select recurso, accion, registro_id, usuario_id, anterior from core.auditoria where cuenta_id = $1 order by creado_en',
    [cuenta.cuentaId],
  );
  await conexion.end();
  return rows;
}

const ultima = async () => (await auditoriaDeLaCuenta()).at(-1);

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Auditada',
    usuario: 'propietarioauditado',
    modulos: ['terceros'],
  });
});

describe('auditoría de bajas', () => {
  it('eliminar un rol queda registrado con quién lo hizo y cómo era el rol', async () => {
    const rol = await cuenta.propietario.post('/api/roles', { nombre: 'Vaquero', permisos: [] });

    await cuenta.propietario.delete(`/api/roles/${rol.cuerpo.id}`);

    expect(await ultima()).toMatchObject({
      recurso: 'core.roles',
      accion: 'eliminar',
      registro_id: rol.cuerpo.id,
      usuario_id: expect.any(String),
      anterior: expect.objectContaining({ nombre: 'Vaquero' }),
    });
  });

  it('desactivar un usuario queda registrado, sin el hash de su contraseña', async () => {
    const rol = await cuenta.propietario.post('/api/roles', { nombre: 'Ordeñador', permisos: [] });
    const usuario = await cuenta.propietario.post('/api/usuarios', {
      nombres: 'Rosa',
      apellidos: 'Tzul',
      contrasena: CONTRASENA_DE_PRUEBA,
      empresaIds: [cuenta.empresaId],
      rolIds: [rol.cuerpo.id],
    });

    await cuenta.propietario.patch(`/api/usuarios/${usuario.cuerpo.id}`, { activo: false });

    const registro = await ultima();
    expect(registro).toMatchObject({ recurso: 'core.usuarios', accion: 'inactivar', registro_id: usuario.cuerpo.id });
    expect(registro?.anterior).not.toHaveProperty('hashContrasena');
  });

  it('eliminar un contacto e inactivar a un cliente quedan registrados', async () => {
    const tercero = await cuenta.propietario.post('/api/terceros', { tipo: 'individual', nombres: 'Ana' });
    const url = `/api/terceros/${tercero.cuerpo.id}`;
    const contacto = await cuenta.propietario.post(`${url}/contactos`, { nombre: 'Hija de Ana' });

    await cuenta.propietario.delete(`${url}/contactos/${contacto.cuerpo.id}`);
    await cuenta.propietario.put(url, { tipo: 'individual', nombres: 'Ana', activo: false });

    const recientes = (await auditoriaDeLaCuenta()).slice(-2);
    expect(recientes.map(({ recurso, accion }) => `${recurso}:${accion}`)).toEqual([
      'terceros.contactos:eliminar',
      'terceros.terceros:inactivar',
    ]);
  });
});
