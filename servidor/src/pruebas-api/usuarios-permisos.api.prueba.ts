import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { definicionesModulos } from '../modulos/indice.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  CONTRASENA_DE_PRUEBA,
  crearUsuarioConPermisos,
  darDeAltaCuenta,
  type CuentaDePrueba,
} from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let ajena: CuentaDePrueba;
let segundaEmpresaId: string;
let rolContadorId: string;

interface Auditado {
  recurso: string;
  accion: string;
  registro_id: string;
  anterior: Record<string, unknown>;
}

async function auditoria(recurso: string): Promise<Auditado[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  const { rows } = await conexion.query<Auditado>(
    'select recurso, accion, registro_id, anterior from core.auditoria where cuenta_id = $1 and recurso = $2 order by creado_en',
    [cuenta.cuentaId, recurso],
  );
  await conexion.end();
  return rows;
}

async function crearUsuario(cliente: ClienteApi, nombres: string, extra: Record<string, unknown> = {}) {
  const respuesta = await cliente.post('/api/usuarios', {
    nombres,
    apellidos: 'Permisos',
    contrasena: CONTRASENA_DE_PRUEBA,
    empresaIds: [cuenta.empresaId],
    ...extra,
  });
  expect(respuesta.estado).toBe(201);
  return respuesta.cuerpo as { id: string; usuario: string };
}

async function entrar(usuario: string): Promise<ClienteApi> {
  const cliente = entorno.nuevoCliente();
  await cliente.iniciarSesion(usuario, CONTRASENA_DE_PRUEBA);
  await cliente.get('/api/sesion');
  return cliente;
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Permisos', usuario: 'propietariopermisos' });
  ajena = await darDeAltaCuenta(entorno, { nombre: 'Ajena de permisos', usuario: 'propietarioajenop' });
  const segunda = await cuenta.propietario.post('/api/empresas', { nombre: 'Segunda finca' });
  segundaEmpresaId = segunda.cuerpo.id;
  const rol = await cuenta.propietario.post('/api/roles', { nombre: 'Contador', permisos: ['usuarios.ver'] });
  rolContadorId = rol.cuerpo.id;
});

describe('permisos directos de un usuario', () => {
  it('quien no tiene usuarios.asignar-permisos no puede cambiarlos ni pedirlos al crear', async () => {
    const editor = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Editor',
      apellidos: 'Sin poder',
      permisos: ['usuarios.ver', 'usuarios.crear', 'usuarios.editar'],
    });
    const objetivo = await crearUsuario(cuenta.propietario, 'Objetivo');

    const cambio = await editor.put(`/api/usuarios/${objetivo.id}/permisos`, {
      rolIds: [],
      permisos: ['usuarios.ver'],
    });
    const creacion = await editor.post('/api/usuarios', {
      nombres: 'Con',
      apellidos: 'Poder',
      contrasena: CONTRASENA_DE_PRUEBA,
      empresaIds: [cuenta.empresaId],
      permisos: ['usuarios.ver'],
    });
    const sinPermisos = await editor.post('/api/usuarios', {
      nombres: 'Sin',
      apellidos: 'Permisos',
      contrasena: CONTRASENA_DE_PRUEBA,
      empresaIds: [cuenta.empresaId],
    });

    expect(cambio.estado).toBe(403);
    expect(creacion.estado).toBe(403);
    expect(sinPermisos.estado).toBe(201);
  });

  it('no puede cambiarse a sí mismo', async () => {
    const yo = (await cuenta.propietario.get('/api/sesion')).cuerpo.usuario.id;

    const respuesta = await cuenta.propietario.put(`/api/usuarios/${yo}/permisos`, { rolIds: [], permisos: [] });

    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('no_puede_cambiarse_a_si_mismo');
  });

  it('rechaza un rol de otra cuenta, un permiso desconocido y uno de solo superacceso', async () => {
    const objetivo = await crearUsuario(cuenta.propietario, 'Rechazos');
    const rolAjeno = await ajena.propietario.post('/api/roles', { nombre: 'Rol ajeno', permisos: [] });
    const enviar = (cuerpo: object) => cuenta.propietario.put(`/api/usuarios/${objetivo.id}/permisos`, cuerpo);

    const conRolAjeno = await enviar({ rolIds: [rolAjeno.cuerpo.id], permisos: [] });
    const desconocido = await enviar({ rolIds: [], permisos: ['inventado.ver'] });
    const deSuperacceso = await enviar({ rolIds: [], permisos: ['configuracion.gestionar'] });

    expect(conRolAjeno.cuerpo.error.codigo).toBe('rol_ajeno');
    expect(desconocido.cuerpo.error.codigo).toBe('permiso_desconocido');
    expect(deSuperacceso.cuerpo.error.codigo).toBe('permiso_desconocido');
  });

  it('puede dar permisos que no tiene y el permiso vale en la petición siguiente, en todas sus empresas', async () => {
    const objetivo = await crearUsuario(cuenta.propietario, 'Directo', {
      empresaIds: [cuenta.empresaId, segundaEmpresaId],
    });
    const usuario = await entrar(objetivo.usuario);
    await usuario.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
    expect((await usuario.get('/api/usuarios')).estado).toBe(403);

    const cambio = await cuenta.propietario.put(`/api/usuarios/${objetivo.id}/permisos`, {
      rolIds: [],
      permisos: ['usuarios.ver'],
    });
    const enLaPrimera = await usuario.get('/api/usuarios');
    await usuario.put('/api/sesion/empresa-activa', { empresaId: segundaEmpresaId });
    const enLaSegunda = await usuario.get('/api/usuarios');

    expect(cambio.estado).toBe(204);
    expect(enLaPrimera.estado).toBe(200);
    expect(enLaSegunda.estado).toBe(200);
  });

  it('un permiso directo no da entrada a una empresa donde no es miembro', async () => {
    const objetivo = await crearUsuario(cuenta.propietario, 'Sinentrada');
    await cuenta.propietario.put(`/api/usuarios/${objetivo.id}/permisos`, { rolIds: [], permisos: ['usuarios.ver'] });
    const usuario = await entrar(objetivo.usuario);

    const cambio = await usuario.put('/api/sesion/empresa-activa', { empresaId: segundaEmpresaId });

    expect(cambio.estado).toBe(404);
  });

  it('una persona puede quedar sin roles y sin permisos: entra y no ve opciones', async () => {
    const objetivo = await crearUsuario(cuenta.propietario, 'Vacio');
    const usuario = await entrar(objetivo.usuario);

    const sesion = await usuario.get('/api/sesion');

    expect(sesion.cuerpo.roles).toEqual([]);
    expect(sesion.cuerpo.permisos).toEqual([]);
  });
});

describe('roles de un usuario y origen de los permisos', () => {
  it('suma los permisos de varios roles y muestra de dónde viene cada uno', async () => {
    const otroRol = await cuenta.propietario.post('/api/roles', { nombre: 'Revisor', permisos: ['usuarios.ver'] });
    const objetivo = await crearUsuario(cuenta.propietario, 'Varios');

    await cuenta.propietario.put(`/api/usuarios/${objetivo.id}/permisos`, {
      rolIds: [rolContadorId, otroRol.cuerpo.id],
      permisos: ['usuarios.ver', 'roles.ver'],
    });
    const detalle = (await cuenta.propietario.get(`/api/usuarios/${objetivo.id}/permisos`)).cuerpo;
    const sesion = await (await entrar(objetivo.usuario)).get('/api/sesion');

    expect(detalle.directos.sort()).toEqual(['roles.ver', 'usuarios.ver']);
    const ver = detalle.efectivos.find((p: { clave: string }) => p.clave === 'usuarios.ver');
    expect(ver.origenes).toEqual([
      { tipo: 'rol', rolId: rolContadorId, rolNombre: 'Contador' },
      { tipo: 'rol', rolId: otroRol.cuerpo.id, rolNombre: 'Revisor' },
      { tipo: 'directo' },
    ]);
    expect(ver.moduloActivo).toBe(true);
    expect(sesion.cuerpo.roles).toEqual(['Contador', 'Revisor']);
    expect(sesion.cuerpo.permisos).toEqual(expect.arrayContaining(['usuarios.ver', 'roles.ver']));
  });

  it('un rol con acceso total se muestra como origen de todos los permisos', async () => {
    const objetivo = await crearUsuario(cuenta.propietario, 'Dueno');
    const roles = await cuenta.propietario.get('/api/roles');
    const propietario = roles.cuerpo.find((r: { nombre: string }) => r.nombre === 'Propietario');

    await cuenta.propietario.put(`/api/usuarios/${objetivo.id}/permisos`, { rolIds: [propietario.id], permisos: [] });
    const detalle = (await cuenta.propietario.get(`/api/usuarios/${objetivo.id}/permisos`)).cuerpo;

    expect(
      detalle.efectivos.every((p: { origenes: { tipo: string }[] }) => p.origenes[0]?.tipo === 'acceso-total'),
    ).toBe(true);
    expect(detalle.efectivos.map((p: { clave: string }) => p.clave)).not.toContain('configuracion.gestionar');
  });

  it('la lista de usuarios trae sus empresas, roles y cuántos permisos directos tiene', async () => {
    const objetivo = await crearUsuario(cuenta.propietario, 'Listado', {
      rolIds: [rolContadorId],
      permisos: ['roles.ver'],
    });

    const lista = (await cuenta.propietario.get('/api/usuarios')).cuerpo;

    expect(lista.find((u: { id: string }) => u.id === objetivo.id)).toMatchObject({
      empresas: [{ empresaId: cuenta.empresaId }],
      roles: [{ rolId: rolContadorId, rolNombre: 'Contador', accesoTotal: false }],
      totalPermisosDirectos: 1,
    });
  });

  it('una cuenta no ve ni cambia los permisos de los usuarios de otra', async () => {
    const objetivo = await crearUsuario(cuenta.propietario, 'Protegido');

    const lectura = await ajena.propietario.get(`/api/usuarios/${objetivo.id}/permisos`);
    const cambio = await ajena.propietario.put(`/api/usuarios/${objetivo.id}/permisos`, { rolIds: [], permisos: [] });

    expect(lectura.estado).toBe(404);
    expect(cambio.estado).toBe(404);
  });
});

describe('roles asignados', () => {
  it('un rol con usuarios no se elimina y se cuenta en totalUsuarios', async () => {
    const rol = await cuenta.propietario.post('/api/roles', { nombre: 'En uso', permisos: [] });
    await crearUsuario(cuenta.propietario, 'Conrol', { rolIds: [rol.cuerpo.id] });

    const eliminado = await cuenta.propietario.delete(`/api/roles/${rol.cuerpo.id}`);
    const lista = (await cuenta.propietario.get('/api/roles')).cuerpo;

    expect(eliminado.cuerpo.error.codigo).toBe('rol_asignado_a_usuarios');
    expect(lista.find((r: { id: string }) => r.id === rol.cuerpo.id).totalUsuarios).toBe(1);
  });
});

describe('auditoría de permisos', () => {
  it('cada rol y permiso que se da o se quita queda registrado', async () => {
    const objetivo = await crearUsuario(cuenta.propietario, 'Auditado');
    const enviar = (rolIds: string[], permisos: string[]) =>
      cuenta.propietario.put(`/api/usuarios/${objetivo.id}/permisos`, { rolIds, permisos });

    await enviar([rolContadorId], ['roles.ver']);
    await enviar([], ['roles.ver']);
    const roles = (await auditoria('core.roles-de-usuario')).filter((a) => a.registro_id === objetivo.id);
    const permisos = (await auditoria('core.permisos-de-usuario')).filter((a) => a.registro_id === objetivo.id);

    expect(roles.map((a) => a.accion)).toEqual(['asignar', 'quitar']);
    expect(roles[0]!.anterior).toMatchObject({ usuario: objetivo.usuario, rolNombre: 'Contador', accesoTotal: false });
    expect(permisos.map((a) => a.accion)).toEqual(['asignar']);
    expect(permisos[0]!.anterior).toMatchObject({ permiso: 'roles.ver' });
  });

  it('las empresas que se dan o se quitan a un usuario quedan registradas', async () => {
    const objetivo = await crearUsuario(cuenta.propietario, 'Empresas');

    await cuenta.propietario.patch(`/api/usuarios/${objetivo.id}`, { empresaIds: [segundaEmpresaId] });
    const registros = (await auditoria('core.empresas-de-usuario')).filter((a) => a.registro_id === objetivo.id);

    expect(registros.map((a) => a.accion)).toEqual(['asignar', 'asignar', 'quitar']);
    expect(registros[2]!.anterior).toMatchObject({ empresaId: cuenta.empresaId, usuario: objetivo.usuario });
  });

  it('los permisos que se agregan o quitan a un rol quedan registrados', async () => {
    const rol = await cuenta.propietario.post('/api/roles', { nombre: 'Cambiante', permisos: ['usuarios.ver'] });

    await cuenta.propietario.put(`/api/roles/${rol.cuerpo.id}`, {
      nombre: 'Cambiante',
      accesoTotal: false,
      permisos: ['roles.ver'],
    });
    const registros = (await auditoria('core.permisos-de-rol')).filter((a) => a.registro_id === rol.cuerpo.id);

    expect(registros.map((a) => [a.accion, a.anterior.permiso])).toEqual([
      ['asignar', 'roles.ver'],
      ['quitar', 'usuarios.ver'],
    ]);
  });
});

describe('claves de permisos guardadas', () => {
  it('ninguna fila de rol_permisos ni de usuario_permisos tiene una clave que ningún módulo declare', async () => {
    const declaradas = new Set(definicionesModulos.flatMap((modulo) => modulo.permisos.map((p) => p.clave)));
    const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    await conexion.connect();
    const { rows } = await conexion.query<{ permiso: string }>(
      'select permiso from core.rol_permisos union select permiso from core.usuario_permisos',
    );
    await conexion.end();

    expect(rows.map((fila) => fila.permiso).filter((permiso) => !declaradas.has(permiso))).toEqual([]);
  });
});
