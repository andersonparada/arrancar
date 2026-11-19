import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/inventarios/unidades';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

let contador = 0;

/** Cada llamada da un nombre y un símbolo distintos, porque no se pueden repetir en la empresa. */
const datos = (cambios: Record<string, unknown> = {}) => ({
  nombre: `Unidad ${++contador}`,
  simbolo: `u${contador}`,
  magnitud: 'masa',
  factorALaReferencia: '100',
  activo: true,
  ...cambios,
});

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'inventarios'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno', modulos });
});

describe('unidades de medida por API', () => {
  it('se registran, se listan y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(
      `${RUTA}/${id}`,
      datos({ nombre: 'Quintal grande', simbolo: 'qqg', factorALaReferencia: '110' }),
    );

    expect(creado.estado).toBe(201);
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect((await cuenta.propietario.get(RUTA)).cuerpo).toEqual([cambiado.cuerpo]);
    expect(cambiado.cuerpo).toMatchObject({ nombre: 'Quintal grande', factorALaReferencia: '110.00000000' });
  });

  it('se inactivan sin perder sus datos', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const inactivo = await cuenta.propietario.put(
      `${RUTA}/${creado.cuerpo.id}`,
      datos({ nombre: creado.cuerpo.nombre, simbolo: creado.cuerpo.simbolo, activo: false }),
    );

    expect(inactivo.cuerpo).toEqual({ ...creado.cuerpo, activo: false });
  });

  it('la lista sugerida llega sola la primera vez que se abre el catálogo', async () => {
    const sembrada = await darDeAltaCuenta(entorno, {
      nombre: 'Sembrada',
      usuario: 'propietariosembrado',
      modulos: ['terceros', 'libro-de-compras', 'inventarios'],
    });

    const primera = (await sembrada.propietario.get(RUTA)).cuerpo as { nombre: string; simbolo: string }[];
    const segunda = (await sembrada.propietario.get(RUTA)).cuerpo as unknown[];

    expect(primera.map((unidad) => unidad.nombre)).toEqual(
      expect.arrayContaining(['Libra', 'Quintal', 'Galón', 'Caja']),
    );
    expect(segunda).toHaveLength(primera.length);
  });

  it('no se registra una masa sin factor ni un empaque con factor', async () => {
    const sinFactor = await cuenta.propietario.post(
      RUTA,
      datos({ nombre: 'A', simbolo: 'a', factorALaReferencia: null }),
    );
    const conFactor = await cuenta.propietario.post(
      RUTA,
      datos({ nombre: 'B', simbolo: 'b', magnitud: 'empaque', factorALaReferencia: '2' }),
    );

    expect([sinFactor.estado, conFactor.estado]).toEqual([400, 400]);
  });

  it('el nombre y el símbolo no se repiten (sin mayúsculas ni acentos)', async () => {
    await cuenta.propietario.post(RUTA, datos({ nombre: 'Galón de prueba', simbolo: 'gp' }));

    const repetido = await cuenta.propietario.post(RUTA, datos({ nombre: ' GALON DE PRUEBA ', simbolo: 'otro' }));

    expect(repetido.estado).toBe(409);
  });

  it('se eliminan si ningún artículo las usa, con auditoría; si no, se rechaza', async () => {
    const libre = (await cuenta.propietario.post(RUTA, datos({ nombre: 'Libre', simbolo: 'lib' }))).cuerpo.id;
    const usada = (await cuenta.propietario.post(RUTA, datos({ nombre: 'Usada', simbolo: 'usa' }))).cuerpo.id;
    const categoria = await cuenta.propietario.post('/api/inventarios/categorias', {
      nombre: 'Para usar la unidad',
      tipoDeInventarioPorOmision: 'mercaderia',
      activo: true,
    });
    await cuenta.propietario.post('/api/inventarios/articulos', {
      codigo: 'U-1',
      nombre: 'Artículo en quintales',
      categoriaId: categoria.cuerpo.id,
      tipoDeInventario: 'mercaderia',
      unidadBaseId: usada,
    });

    const eliminada = await cuenta.propietario.delete(`${RUTA}/${libre}`);
    const enUso = await cuenta.propietario.delete(`${RUTA}/${usada}`);

    expect(eliminada.estado).toBe(204);
    expect(enUso.estado).toBe(422);
    expect(enUso.cuerpo.error.codigo).toBe('unidad_en_uso');
    const rastro = await comoPropietario(
      "select 1 from core.auditoria where recurso = 'inventarios.unidades' and accion = 'eliminar' and registro_id = $1",
      [libre],
    );
    expect(rastro).toHaveLength(1);
  });

  it('otra cuenta no los ve', async () => {
    const ajeno = await otraCuenta.propietario.post(RUTA, datos());

    expect((await cuenta.propietario.get(`${RUTA}/${ajeno.cuerpo.id}`)).estado).toBe(404);
    expect((await otraCuenta.propietario.get(RUTA)).cuerpo).toEqual([ajeno.cuerpo]);
  });

  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    await cuenta.propietario.post(RUTA, datos());
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);

    const revision = await cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'unidades.xlsx',
      tipoMime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contenido: exportado.cuerpo,
    });

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });

  it('para registrar hace falta el permiso de crear', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['inventarios.unidades.ver'],
    });

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.delete(`${RUTA}/${randomUUID()}`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});
