import pg from 'pg';
import { beforeAll, describe, expect, it } from 'vitest';
import { configuracion } from '../configuracion.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/empresas/tipos-de-localidad';
const SUGERIDOS = ['Beneficio', 'Bodega', 'Finca', 'Oficina', 'Planta', 'Taller', 'Tienda'];
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

const datos = (cambios: Record<string, unknown> = {}) => ({ nombre: 'Registro de prueba', activo: true, ...cambios });

const listar = async (quien: CuentaDePrueba) => (await quien.propietario.get(RUTA)).cuerpo as Array<any>;

/** Consulta a la base como propietario (la app no ve otras empresas ni puede leer la auditoría a su gusto). */
async function comoPropietario<T extends pg.QueryResultRow>(sql: string, parametros: unknown[]): Promise<T[]> {
  const conexion = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
  await conexion.connect();
  try {
    return (await conexion.query<T>(sql, parametros)).rows;
  } finally {
    await conexion.end();
  }
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado' });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno' });
});

describe('tipos de localidad por API', () => {
  it('al abrir el catálogo de una empresa sin tipos recibe la lista sugerida, una sola vez', async () => {
    const primera = await listar(cuenta);
    const segunda = await listar(cuenta);

    expect(primera.map((t) => t.nombre).sort()).toEqual(SUGERIDOS);
    expect(primera.every((t) => t.activo)).toBe(true);
    expect(segunda).toEqual(primera);
  });

  it('se registran, se consultan y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(`${RUTA}/${id}`, datos({ nombre: 'Registro cambiado' }));

    expect(creado.estado).toBe(201);
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect((await listar(cuenta)).find((t) => t.id === id)).toEqual(cambiado.cuerpo);
    expect(cambiado.cuerpo.nombre).toBe('Registro cambiado');
  });

  it('no repiten el nombre dentro de la empresa', async () => {
    const repetido = await cuenta.propietario.post(RUTA, datos({ nombre: 'Finca' }));

    expect(repetido.estado).toBe(409);
    expect(repetido.cuerpo.error.mensaje).toBe('Ya existe un tipo de localidad con ese nombre.');
  });

  it('el nombre no pasa de 60 caracteres', async () => {
    expect((await cuenta.propietario.post(RUTA, datos({ nombre: 'a'.repeat(61) }))).estado).toBe(400);
    expect((await cuenta.propietario.post(RUTA, datos({ nombre: 'a'.repeat(60) }))).estado).toBe(201);
  });

  it('se inactivan sin perder sus datos y la baja queda en la auditoría', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Para inactivar' }));
    const inactivo = await cuenta.propietario.put(
      `${RUTA}/${creado.cuerpo.id}`,
      datos({ nombre: 'Para inactivar', activo: false }),
    );
    const rastro = await comoPropietario<{ accion: string }>(
      "select accion from core.auditoria where recurso = 'empresas.tipos-de-localidad' and registro_id = $1",
      [creado.cuerpo.id],
    );

    expect(inactivo.cuerpo).toEqual({ ...creado.cuerpo, activo: false });
    expect(rastro).toEqual([{ accion: 'inactivar' }]);
  });

  it('se eliminan y la baja queda en la auditoría con cómo estaba', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos({ nombre: 'Para eliminar' }));
    const eliminado = await cuenta.propietario.delete(`${RUTA}/${creado.cuerpo.id}`);
    const rastro = await comoPropietario<{ accion: string; anterior: { nombre: string } }>(
      "select accion, anterior from core.auditoria where recurso = 'empresas.tipos-de-localidad' and registro_id = $1",
      [creado.cuerpo.id],
    );

    expect(eliminado.estado).toBe(204);
    expect((await cuenta.propietario.get(`${RUTA}/${creado.cuerpo.id}`)).estado).toBe(404);
    expect(rastro).toEqual([{ accion: 'eliminar', anterior: expect.objectContaining({ nombre: 'Para eliminar' }) }]);
  });

  it('otra cuenta no los ve ni los toca', async () => {
    const ajeno = (await listar(otraCuenta)).find((t) => t.nombre === 'Taller');

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.id}`)).estado).toBe(404);
    expect((await cuenta.propietario.delete(`${RUTA}/${ajeno.id}`)).estado).toBe(404);
    expect((await listar(otraCuenta)).some((t) => t.id === ajeno.id)).toBe(true);
  });

  it('una empresa nueva recibe la lista sugerida y una con esa configuración se puede eliminar', async () => {
    const nueva = await cuenta.propietario.post('/api/empresas', { nombre: 'Finca Nueva' });
    const tipos = () =>
      comoPropietario<{ nombre: string }>('select nombre from empresas.tipos_de_localidad where empresa_id = $1', [
        nueva.cuerpo.id,
      ]);

    expect((await tipos()).map((t) => t.nombre).sort()).toEqual(SUGERIDOS);
    await comoPropietario('delete from core.empresas where id = $1', [nueva.cuerpo.id]);
    expect(await tipos()).toEqual([]);
  });

  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);

    const revision = await cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'tipos-de-localidad.xlsx',
      tipoMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: exportado.cuerpo,
    });

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });

  it('para registrar y eliminar hace falta el permiso de gestionar', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['empresas.tipos-de-localidad.ver'],
    });
    const uno = (await listar(cuenta))[0];

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos({ nombre: 'Nuevo' }))).estado).toBe(403);
    expect((await lector.delete(`${RUTA}/${uno.id}`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});
