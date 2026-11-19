import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/inventarios/bodegas';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let bodeguero1: ClienteApi;
let bodeguero2: ClienteApi;
let jefe: ClienteApi;
let idDelBodeguero1: string;
let bodega1: string;
let bodega2: string;
let bodega3: string;

const idDe = async (cliente: ClienteApi) => (await cliente.get('/api/sesion')).cuerpo.usuario.id as string;

const datos = (codigo: string, cambios: Record<string, unknown> = {}) => ({
  codigo,
  nombre: `Bodega ${codigo}`,
  localidadId: null,
  responsable: null,
  responsableUsuarioId: null,
  activo: true,
  ...cambios,
});

const permisosDeBodeguero = ['ver', 'crear', 'editar', 'eliminar', 'exportar'].map((a) => `inventarios.bodegas.${a}`);

const idsVistos = async (cliente: ClienteApi) =>
  ((await cliente.get(RUTA)).cuerpo as Array<{ id: string }>).map((b) => b.id).sort();

async function asignar(usuarioId: string, bodegaIds: string[]) {
  const respuesta = await jefe.put(`${RUTA}/accesos/${usuarioId}`, { bodegaIds });
  expect(respuesta.estado).toBe(200);
}

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Aislamiento',
    usuario: 'propietarioaislabod',
    modulos: ['terceros', 'libro-de-compras', 'inventarios'],
  });
  [bodega1, bodega2, bodega3] = await Promise.all(
    ['AIS-1', 'AIS-2', 'AIS-3'].map(async (c) => (await cuenta.propietario.post(RUTA, datos(c))).cuerpo.id),
  );
  jefe = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Jefe',
    apellidos: 'Bodegas',
    permisos: ['inventarios.bodegas.ver', 'inventarios.bodegas.asignar'],
  });
  bodeguero1 = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Uno',
    apellidos: 'Bodeguero',
    permisos: permisosDeBodeguero,
  });
  bodeguero2 = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Dos',
    apellidos: 'Bodeguero',
    permisos: permisosDeBodeguero,
  });
  idDelBodeguero1 = await idDe(bodeguero1);
  await asignar(idDelBodeguero1, [bodega1]);
  await asignar(await idDe(bodeguero2), [bodega2]);
});

describe('aislamiento entre bodegueros', () => {
  it('cada uno lista, abre y exporta solo sus bodegas', async () => {
    expect(await idsVistos(bodeguero1)).toEqual([bodega1]);
    expect(await idsVistos(bodeguero2)).toEqual([bodega2]);
    expect((await bodeguero1.get(`${RUTA}/${bodega2}`)).estado).toBe(404);
    expect((await bodeguero2.get(`${RUTA}/${bodega1}`)).estado).toBe(404);
    expect((await bodeguero1.get(`${RUTA}/exportar`)).estado).toBe(200);
  });

  it('no puede cambiar ni eliminar la bodega de otro, y la de otro queda intacta', async () => {
    const editar = await bodeguero1.put(`${RUTA}/${bodega2}`, datos('AIS-2', { nombre: 'Robada' }));
    const eliminar = await bodeguero1.delete(`${RUTA}/${bodega2}`);

    expect([editar.estado, eliminar.estado]).toEqual([404, 404]);
    expect((await cuenta.propietario.get(`${RUTA}/${bodega2}`)).cuerpo.nombre).toBe('Bodega AIS-2');
  });

  it('puede cambiar su propia bodega', async () => {
    const cambiada = await bodeguero1.put(`${RUTA}/${bodega1}`, datos('AIS-1', { responsable: 'Nuevo' }));

    expect(cambiada.estado).toBe(200);
    expect(cambiada.cuerpo.responsable).toBe('Nuevo');
  });

  it('la que crea queda asignada a él y no ve las ajenas; el jefe con asignar no las ve fuera de la ventana', async () => {
    const creada = await bodeguero2.post(RUTA, datos('AIS-4'));

    expect(creada.estado).toBe(201);
    expect(await idsVistos(bodeguero2)).toEqual([bodega2, creada.cuerpo.id].sort());
    expect(await idsVistos(bodeguero1)).toEqual([bodega1]);
    expect(await idsVistos(jefe)).toEqual([]);
  });

  it('quien tiene ver-todas ve todas sin asignaciones', async () => {
    const supervisor = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Supervisa',
      apellidos: 'Bodegas',
      permisos: ['inventarios.bodegas.ver', 'inventarios.bodegas.ver-todas'],
    });

    const vistas = await idsVistos(supervisor);

    expect(vistas).toEqual(expect.arrayContaining([bodega1, bodega2, bodega3]));
  });

  it('quitarle la asignación le quita la bodega y ya no la puede cambiar', async () => {
    await asignar(idDelBodeguero1, []);

    expect(await idsVistos(bodeguero1)).toEqual([]);
    expect((await bodeguero1.put(`${RUTA}/${bodega1}`, datos('AIS-1'))).estado).toBe(404);
    await asignar(idDelBodeguero1, [bodega1]);
  });
});

describe('responsable con usuario', () => {
  it('recibe acceso a la bodega al nombrarlo, sin permiso de asignar, y queda en la auditoría', async () => {
    const creada = await cuenta.propietario.post(RUTA, datos('RES-1', { responsableUsuarioId: idDelBodeguero1 }));

    expect(await idsVistos(bodeguero1)).toContain(creada.cuerpo.id);
    const rastro = await comoPropietario<{ anterior: { aSiMismo: boolean } }>(
      `select anterior from core.auditoria
        where recurso = 'inventarios.accesos-a-bodegas' and accion = 'asignar' and registro_id = $1
          and anterior->>'usuarioId' = $2`,
      [creada.cuerpo.id, idDelBodeguero1],
    );
    expect(rastro.map((r) => r.anterior.aSiMismo)).toEqual([false]);
  });

  it('al cambiar de responsable en una bodega existente, el nuevo recibe acceso', async () => {
    const otra = await cuenta.propietario.post(RUTA, datos('RES-2'));

    await cuenta.propietario.put(
      `${RUTA}/${otra.cuerpo.id}`,
      datos('RES-2', { responsableUsuarioId: idDelBodeguero1 }),
    );

    expect(await idsVistos(bodeguero1)).toContain(otra.cuerpo.id);
  });
});

describe('importar bodegas desde Excel', () => {
  async function libroConUnaFila(usuario: ClienteApi, valores: Record<string, unknown>): Promise<Buffer> {
    const plantilla = (await usuario.get(`${RUTA}/plantilla`)).cuerpo as Buffer;
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(plantilla as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;
    hoja.getRow(1).eachCell((celda, columna) => {
      const valor = valores[String(celda.value)];
      if (valor !== undefined) hoja.getRow(2).getCell(columna).value = valor as ExcelJS.CellValue;
    });
    return Buffer.from(await libro.xlsx.writeBuffer());
  }

  const importar = (usuario: ClienteApi, contenido: Buffer, ensayo: boolean) =>
    usuario.subirImagen('POST', `${RUTA}/importar?ensayo=${ensayo}`, {
      nombreArchivo: 'bodegas.xlsx',
      tipoMime: TIPO_EXCEL,
      contenido,
    });

  const accesosDe = async (codigo: string) =>
    (
      await comoPropietario<{ n: string }>(
        `select count(*) n from inventarios.accesos_a_bodegas a
         join inventarios.bodegas b on b.id = a.bodega_id where b.codigo = $1`,
        [codigo],
      )
    )[0]!.n;

  it('las bodegas importadas no se asignan a quien importa; se reparten desde la ventana de accesos', async () => {
    const importador = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Importa',
      apellidos: 'Bodegas',
      permisos: ['inventarios.bodegas.ver', 'inventarios.bodegas.importar'],
    });
    const libro = await libroConUnaFila(importador, { Código: 'imp-01', Nombre: 'Importada', Activo: 'Sí' });

    const ensayo = await importar(importador, libro, true);
    const guardado = await importar(importador, libro, false);

    expect(ensayo.cuerpo).toMatchObject({ guardado: false, errores: [] });
    expect(guardado.cuerpo).toMatchObject({ guardado: true, errores: [] });
    expect(await accesosDe('IMP-01')).toBe('0');
    expect(await idsVistos(importador)).toEqual([]);
  });

  it('en cambio, la que se registra a mano sí queda asignada a quien la registra', async () => {
    await bodeguero1.post(RUTA, datos('MAN-01'));

    expect(await accesosDe('MAN-01')).toBe('1');
  });
});
