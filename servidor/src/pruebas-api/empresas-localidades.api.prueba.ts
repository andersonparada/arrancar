import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/empresas/localidades';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let tipoId: string;
let encargado: ClienteApi;
let idDelEncargado: string;

const datos = (cambios: Record<string, unknown> = {}) => ({
  codigo: 'FIN-01',
  nombre: 'Finca La Esperanza',
  tipoId,
  codigoEstablecimientoSat: null,
  nombreComercialSat: null,
  departamentoCodigo: '01',
  municipioCodigo: '01',
  direccion: 'Km 10',
  activo: true,
  ...cambios,
});

const primerTipo = async (quien: CuentaDePrueba) =>
  ((await quien.propietario.get('/api/empresas/tipos-de-localidad')).cuerpo as Array<{ id: string }>)[0]!.id;

const asignados = (localidadId: string) =>
  comoPropietario<{ usuario_id: string }>(
    'select usuario_id from empresas.accesos_a_localidades where localidad_id = $1',
    [localidadId],
  );

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado' });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno' });
  tipoId = await primerTipo(cuenta);
  encargado = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Encargado',
    apellidos: 'Sinvertodas',
    permisos: ['ver', 'crear', 'editar', 'eliminar'].map((accion) => `empresas.localidades.${accion}`),
  });
  idDelEncargado = (await encargado.get('/api/sesion')).cuerpo.usuario.id;
});

describe('localidades por API', () => {
  it('se registran, se listan y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const cambiado = await cuenta.propietario.put(`${RUTA}/${creado.cuerpo.id}`, datos({ nombre: 'Finca Nueva' }));

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo.codigo).toBe('FIN-01');
    expect((await cuenta.propietario.get(RUTA)).cuerpo).toEqual([cambiado.cuerpo]);
    expect(cambiado.cuerpo.nombre).toBe('Finca Nueva');
  });

  it('un código, nombre o establecimiento repetido avisa con 409', async () => {
    await cuenta.propietario.post(RUTA, datos({ codigo: 'REP-1', nombre: 'Repetida', codigoEstablecimientoSat: 5 }));
    const otra = { codigo: 'REP-2', nombre: 'Otra', codigoEstablecimientoSat: 6 };

    const porCodigo = await cuenta.propietario.post(RUTA, datos({ ...otra, codigo: 'REP-1' }));
    const porNombre = await cuenta.propietario.post(RUTA, datos({ ...otra, nombre: 'Repetida' }));
    const porSat = await cuenta.propietario.post(RUTA, datos({ ...otra, codigoEstablecimientoSat: 5 }));

    expect([porCodigo.estado, porNombre.estado, porSat.estado]).toEqual([409, 409, 409]);
    expect(porCodigo.cuerpo.error.mensaje).toContain('pida acceso');
  });

  it('el código interno es obligatorio y solo lleva letras, números y guiones', async () => {
    const sin = await cuenta.propietario.post(RUTA, datos({ codigo: '' }));
    const raro = await cuenta.propietario.post(RUTA, datos({ codigo: 'FIN 01', nombre: 'Raro' }));

    expect([sin.estado, raro.estado]).toEqual([400, 400]);
  });

  it('el tipo debe ser de la empresa', async () => {
    const ajeno = await primerTipo(otraCuenta);

    expect((await cuenta.propietario.post(RUTA, datos({ tipoId: ajeno, nombre: 'Con tipo ajeno' }))).estado).toBe(404);
  });

  it('otra cuenta no las ve', async () => {
    const ajena = await otraCuenta.propietario.post(RUTA, datos({ tipoId: await primerTipo(otraCuenta) }));

    expect((await cuenta.propietario.get(`${RUTA}/${ajena.cuerpo.id}`)).estado).toBe(404);
  });

  it('para registrar, eliminar, importar y exportar hace falta cada permiso', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['empresas.localidades.ver'],
    });
    const propia = await cuenta.propietario.post(RUTA, datos({ codigo: 'PER-1', nombre: 'Permisos' }));

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.delete(`${RUTA}/${propia.cuerpo.id}`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});

describe('localidades con acceso por usuario', () => {
  it('quien crea una localidad sin ver todas la ve, queda asignado y la asignación se audita', async () => {
    const creada = await encargado.post(RUTA, datos({ codigo: 'ENC-1', nombre: 'Del encargado' }));
    const rastro = await comoPropietario<{ accion: string; anterior: { aSiMismo: boolean; codigo: string } }>(
      "select accion, anterior from core.auditoria where recurso = 'empresas.accesos-a-localidades' and registro_id = $1",
      [creada.cuerpo.id],
    );

    expect(creada.estado).toBe(201);
    expect((await encargado.get(`${RUTA}/${creada.cuerpo.id}`)).estado).toBe(200);
    expect((await asignados(creada.cuerpo.id)).map((a) => a.usuario_id)).toEqual([idDelEncargado]);
    expect(rastro).toEqual([
      { accion: 'asignar', anterior: expect.objectContaining({ aSiMismo: true, codigo: 'ENC-1' }) },
    ]);
  });

  it('no ve ni cambia ni elimina las que no tiene asignadas', async () => {
    const ajena = await cuenta.propietario.post(RUTA, datos({ codigo: 'AJE-1', nombre: 'Del propietario' }));
    const url = `${RUTA}/${ajena.cuerpo.id}`;

    const lista = (await encargado.get(RUTA)).cuerpo as Array<{ id: string }>;

    expect(lista.some(({ id }) => id === ajena.cuerpo.id)).toBe(false);
    expect((await encargado.get(url)).estado).toBe(404);
    expect((await encargado.put(url, datos({ nombre: 'Robada' }))).estado).toBe(404);
    expect((await encargado.delete(url)).estado).toBe(404);
  });

  it('si el código ya existe pero no la ve, recibe la alerta de duplicado', async () => {
    await cuenta.propietario.post(RUTA, datos({ codigo: 'OCU-1', nombre: 'Oculta' }));

    const repetida = await encargado.post(RUTA, datos({ codigo: 'OCU-1', nombre: 'Otra del encargado' }));

    expect(repetida.estado).toBe(409);
    expect(repetida.cuerpo.error.codigo).toBe('duplicado');
  });

  it('al eliminarla queda en la auditoría con cómo estaba y sus usuarios con acceso', async () => {
    const creada = await encargado.post(RUTA, datos({ codigo: 'BAJ-1', nombre: 'Para eliminar' }));

    const baja = await encargado.delete(`${RUTA}/${creada.cuerpo.id}`);
    const rastro = await comoPropietario<{
      anterior: { codigo: string; usuariosConAcceso: Array<{ usuarioId: string }> };
    }>(
      "select anterior from core.auditoria where recurso = 'empresas.localidades' and accion = 'eliminar' and registro_id = $1",
      [creada.cuerpo.id],
    );

    expect(baja.estado).toBe(204);
    expect(await asignados(creada.cuerpo.id)).toEqual([]);
    expect(rastro[0]?.anterior.codigo).toBe('BAJ-1');
    expect(rastro[0]?.anterior.usuariosConAcceso.map((u) => u.usuarioId)).toEqual([idDelEncargado]);
  });

  it('una empresa con localidades y accesos, sin movimientos, se puede eliminar', async () => {
    const nueva = await cuenta.propietario.post('/api/empresas', { nombre: 'Finca Desechable' });
    await cuenta.propietario.put('/api/sesion/empresa-activa', { empresaId: nueva.cuerpo.id });
    const local = await cuenta.propietario.post(
      RUTA,
      datos({ codigo: 'DES-1', nombre: 'Desechable', tipoId: await primerTipo(cuenta) }),
    );
    const conAcceso = await asignados(local.cuerpo.id);

    await comoPropietario('delete from core.empresas where id = $1', [nueva.cuerpo.id]);

    expect(local.estado).toBe(201);
    expect(conAcceso).toHaveLength(1);
    expect(await asignados(local.cuerpo.id)).toEqual([]);
    await cuenta.propietario.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
  });
});
