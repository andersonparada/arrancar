import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/empresas/departamentos';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let encargado: ClienteApi;
let localidadDelPropietario: string;
let localidadDelEncargado: string;
let localidadAjena: string;

const permisosDe = (recurso: string, acciones: string[]) => acciones.map((accion) => `empresas.${recurso}.${accion}`);

const datos = (cambios: Record<string, unknown> = {}) => ({
  codigo: 'CON-01',
  nombre: 'Contabilidad',
  localidadId: null,
  activo: true,
  ...cambios,
});

async function crearLocalidad(usuario: ClienteApi, codigo: string): Promise<string> {
  const tipos = (await usuario.get('/api/empresas/tipos-de-localidad')).cuerpo as Array<{ id: string }>;
  const creada = await usuario.post('/api/empresas/localidades', {
    codigo,
    nombre: `Localidad ${codigo}`,
    tipoId: tipos[0]!.id,
    codigoEstablecimientoSat: null,
    nombreComercialSat: null,
    departamentoCodigo: null,
    municipioCodigo: null,
    direccion: null,
    activo: true,
  });
  return creada.cuerpo.id as string;
}

const rastro = (accion: string, id: string) =>
  comoPropietario<{ anterior: { nombre: string } }>(
    "select anterior from core.auditoria where recurso = 'empresas.departamentos' and accion = $1 and registro_id = $2",
    [accion, id],
  );

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado' });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno' });
  encargado = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Encargado',
    apellidos: 'Sinvertodas',
    permisos: [
      ...permisosDe('departamentos', ['ver', 'crear', 'editar', 'eliminar']),
      ...permisosDe('localidades', ['ver', 'crear']),
      ...permisosDe('tipos-de-localidad', ['ver']),
    ],
  });
  localidadDelPropietario = await crearLocalidad(cuenta.propietario, 'PRO-1');
  localidadDelEncargado = await crearLocalidad(encargado, 'ENC-1');
  localidadAjena = await crearLocalidad(otraCuenta.propietario, 'AJE-1');
});

describe('departamentos por API', () => {
  it('se registran con código en mayúsculas, se listan y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ codigo: 'adm-01', nombre: 'Administración' }));
    const cambiado = await cuenta.propietario.put(
      `${RUTA}/${creado.cuerpo.id}`,
      datos({ codigo: 'ADM-01', nombre: 'Administración general' }),
    );

    expect(creado.estado).toBe(201);
    expect(creado.cuerpo).toMatchObject({ codigo: 'ADM-01', localidadId: null, localidadNombre: null });
    expect((await cuenta.propietario.get(`${RUTA}/${creado.cuerpo.id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect(cambiado.cuerpo.nombre).toBe('Administración general');
  });

  it('puede ser de una localidad y se muestra su nombre', async () => {
    const creado = await cuenta.propietario.post(
      RUTA,
      datos({ codigo: 'LOC-01', nombre: 'De una localidad', localidadId: localidadDelPropietario }),
    );

    expect(creado.cuerpo).toMatchObject({ localidadId: localidadDelPropietario, localidadNombre: 'Localidad PRO-1' });
  });

  it('el código y el nombre son únicos en la empresa, aunque sean de localidades distintas', async () => {
    await cuenta.propietario.post(RUTA, datos({ codigo: 'REP-1', nombre: 'Repetido' }));
    const porCodigo = await cuenta.propietario.post(RUTA, datos({ codigo: 'REP-1', nombre: 'Otro' }));
    const porNombre = await cuenta.propietario.post(
      RUTA,
      datos({ codigo: 'REP-2', nombre: 'Repetido', localidadId: localidadDelPropietario }),
    );

    expect([porCodigo.estado, porNombre.estado]).toEqual([409, 409]);
    expect(porNombre.cuerpo.error.mensaje).toBe('Ya existe un departamento con ese nombre.');
  });

  it('el código interno es obligatorio y solo lleva letras, números y guiones', async () => {
    const sin = await cuenta.propietario.post(RUTA, datos({ codigo: '' }));
    const raro = await cuenta.propietario.post(RUTA, datos({ codigo: 'AB CD', nombre: 'Raro' }));

    expect([sin.estado, raro.estado]).toEqual([400, 400]);
  });

  it('no acepta una localidad de otra cuenta', async () => {
    const conAjena = await cuenta.propietario.post(RUTA, datos({ nombre: 'Con ajena', localidadId: localidadAjena }));

    expect(conAjena.estado).toBe(404);
  });

  it('otra cuenta no los ve', async () => {
    const ajeno = await otraCuenta.propietario.post(RUTA, datos({ codigo: 'AJE-D', nombre: 'Ajeno' }));

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
  });

  it('para registrar, eliminar, importar y exportar hace falta cada permiso', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['empresas.departamentos.ver'],
    });
    const propio = await cuenta.propietario.post(RUTA, datos({ codigo: 'PER-1', nombre: 'Permisos' }));

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.delete(`${RUTA}/${propio.cuerpo.id}`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});

describe('departamentos con alcance por localidad', () => {
  it('quien no ve todas las localidades ve los de toda la empresa y los de sus localidades', async () => {
    const general = await cuenta.propietario.post(RUTA, datos({ codigo: 'ALC-G', nombre: 'Alcance general' }));
    const suyo = await cuenta.propietario.post(
      RUTA,
      datos({ codigo: 'ALC-S', nombre: 'Alcance suyo', localidadId: localidadDelEncargado }),
    );
    const ajeno = await cuenta.propietario.post(
      RUTA,
      datos({ codigo: 'ALC-A', nombre: 'Alcance ajeno', localidadId: localidadDelPropietario }),
    );

    const visibles = ((await encargado.get(RUTA)).cuerpo as Array<{ id: string }>).map(({ id }) => id);

    expect(visibles).toContain(general.cuerpo.id);
    expect(visibles).toContain(suyo.cuerpo.id);
    expect(visibles).not.toContain(ajeno.cuerpo.id);
    expect((await encargado.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
  });

  it('no crea, mueve, cambia ni elimina en una localidad que no ve', async () => {
    const propio = await encargado.post(RUTA, datos({ codigo: 'MOV-1', nombre: 'Del encargado' }));
    const ajeno = await cuenta.propietario.post(
      RUTA,
      datos({ codigo: 'MOV-2', nombre: 'Del propietario', localidadId: localidadDelPropietario }),
    );

    const creado = await encargado.post(RUTA, datos({ codigo: 'MOV-3', localidadId: localidadDelPropietario }));
    const movido = await encargado.put(
      `${RUTA}/${propio.cuerpo.id}`,
      datos({ codigo: 'MOV-1', nombre: 'Del encargado', localidadId: localidadDelPropietario }),
    );

    expect([propio.estado, creado.estado, movido.estado]).toEqual([201, 404, 404]);
    expect((await encargado.put(`${RUTA}/${ajeno.cuerpo.id}`, datos({ codigo: 'MOV-2' }))).estado).toBe(404);
    expect((await encargado.delete(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
  });

  it('crea y mueve dentro de sus localidades', async () => {
    const creado = await encargado.post(
      RUTA,
      datos({ codigo: 'SUY-1', nombre: 'En su localidad', localidadId: localidadDelEncargado }),
    );
    const sinLocalidad = await encargado.put(
      `${RUTA}/${creado.cuerpo.id}`,
      datos({ codigo: 'SUY-1', nombre: 'En su localidad' }),
    );

    expect(creado.estado).toBe(201);
    expect(sinLocalidad.cuerpo.localidadId).toBeNull();
  });
});

describe('baja de departamentos', () => {
  it('al eliminarlo queda en la auditoría con cómo estaba', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ codigo: 'BAJ-1', nombre: 'Para eliminar' }));

    const baja = await cuenta.propietario.delete(`${RUTA}/${creado.cuerpo.id}`);

    expect(baja.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA}/${creado.cuerpo.id}`)).estado).toBe(404);
    expect((await rastro('eliminar', creado.cuerpo.id)).map((fila) => fila.anterior.nombre)).toEqual(['Para eliminar']);
  });

  it('inactivar y reactivar quedan en la auditoría', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ codigo: 'EST-1', nombre: 'Cambia de estado' }));
    const url = `${RUTA}/${creado.cuerpo.id}`;

    await cuenta.propietario.put(url, datos({ codigo: 'EST-1', nombre: 'Cambia de estado', activo: false }));
    await cuenta.propietario.put(url, datos({ codigo: 'EST-1', nombre: 'Cambia de estado', activo: true }));

    expect(await rastro('inactivar', creado.cuerpo.id)).toHaveLength(1);
    expect(await rastro('reactivar', creado.cuerpo.id)).toHaveLength(1);
  });

  it('una localidad con departamentos no se elimina (se inactiva)', async () => {
    const localidad = await crearLocalidad(cuenta.propietario, 'USO-1');
    await cuenta.propietario.post(RUTA, datos({ codigo: 'USO-D', nombre: 'Usa la localidad', localidadId: localidad }));

    const baja = await cuenta.propietario.delete(`/api/empresas/localidades/${localidad}`);

    expect(baja.estado).toBe(409);
  });

  it('una empresa con departamentos, sin movimientos, se puede eliminar', async () => {
    const nueva = await cuenta.propietario.post('/api/empresas', { nombre: 'Finca Desechable' });
    await cuenta.propietario.put('/api/sesion/empresa-activa', { empresaId: nueva.cuerpo.id });
    const local = await crearLocalidad(cuenta.propietario, 'DES-1');
    const dep = await cuenta.propietario.post(
      RUTA,
      datos({ codigo: 'DES-D', nombre: 'Desechable', localidadId: local }),
    );

    await comoPropietario('delete from core.empresas where id = $1', [nueva.cuerpo.id]);
    const quedan = await comoPropietario('select 1 from empresas.departamentos where id = $1', [dep.cuerpo.id]);

    expect(dep.estado).toBe(201);
    expect(quedan).toEqual([]);
    await cuenta.propietario.put('/api/sesion/empresa-activa', { empresaId: cuenta.empresaId });
  });
});
