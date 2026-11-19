import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/inventarios/categorias';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;

let contador = 0;

/** Cada llamada da un nombre distinto, porque no se puede repetir en la empresa. */
const datos = (cambios: Record<string, unknown> = {}) => ({
  nombre: `Categoría ${++contador}`,
  tipoDeInventarioPorOmision: 'mercaderia',
  activo: true,
  ...cambios,
});

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'inventarios'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Generada', usuario: 'propietariogenerado', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena', usuario: 'propietarioajeno', modulos });
});

describe('categorías por API', () => {
  it('se registran, se listan y se cambian', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const id = creado.cuerpo.id;
    const cambiado = await cuenta.propietario.put(`${RUTA}/${id}`, datos({ nombre: 'Registro cambiado' }));

    expect(creado.estado).toBe(201);
    expect((await cuenta.propietario.get(`${RUTA}/${id}`)).cuerpo).toEqual(cambiado.cuerpo);
    expect((await cuenta.propietario.get(RUTA)).cuerpo).toEqual([cambiado.cuerpo]);
    expect(cambiado.cuerpo.nombre).toBe('Registro cambiado');
  });

  it('se inactivan sin perder sus datos', async () => {
    const creado = await cuenta.propietario.post(RUTA, datos());
    const inactivo = await cuenta.propietario.put(
      `${RUTA}/${creado.cuerpo.id}`,
      datos({ nombre: creado.cuerpo.nombre, activo: false }),
    );

    expect(inactivo.cuerpo).toEqual({ ...creado.cuerpo, activo: false });
  });

  it('el nombre no se repite (sin mayúsculas ni acentos)', async () => {
    await cuenta.propietario.post(RUTA, datos({ nombre: 'Alimentación' }));

    const repetido = await cuenta.propietario.post(RUTA, datos({ nombre: ' ALIMENTACION ' }));

    expect(repetido.estado).toBe(409);
  });

  it('se eliminan sin artículos, con auditoría; con artículos se rechaza', async () => {
    const libre = (await cuenta.propietario.post(RUTA, datos())).cuerpo.id;
    const usada = (await cuenta.propietario.post(RUTA, datos())).cuerpo.id;
    const unidad = (await cuenta.propietario.get('/api/inventarios/unidades')).cuerpo[0].id;
    await cuenta.propietario.post('/api/inventarios/articulos', {
      codigo: 'C-1',
      nombre: 'Artículo de la categoría',
      categoriaId: usada,
      tipoDeInventario: 'mercaderia',
      unidadBaseId: unidad,
    });

    const eliminada = await cuenta.propietario.delete(`${RUTA}/${libre}`);
    const enUso = await cuenta.propietario.delete(`${RUTA}/${usada}`);

    expect(eliminada.estado).toBe(204);
    expect(enUso.estado).toBe(422);
    expect(enUso.cuerpo.error.codigo).toBe('categoria_en_uso');
    const rastro = await comoPropietario(
      "select 1 from core.auditoria where recurso = 'inventarios.categorias' and accion = 'eliminar' and registro_id = $1",
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
      nombreArchivo: 'categorias.xlsx',
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
      permisos: ['inventarios.categorias.ver'],
    });

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.delete(`${RUTA}/${randomUUID()}`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });
});
