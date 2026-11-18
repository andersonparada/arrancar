/**
 * Excel «Plazos de proveedores» (PC-4): plantilla, exportar, importar con ensayo, proveedor por NIT o por nombre,
 * nombre repetido, proveedor inexistente, repetido en el archivo, todo o nada y permisos.
 */
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const RUTA = '/api/cuentas-por-pagar/condiciones';
const PERMISOS = 'cuentas-por-pagar.condiciones';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const NOMBRE_REPETIDO = 'Gemelos del Plazo, S.A.';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let importador: ClienteApi;
let exportador: ClienteApi;
let soloVer: ClienteApi;
let nitConPlazo: string;
let nitSinPlazo: string;
let proveedorSinNit: string;

type Fila = Record<string, unknown>;

/** La plantilla con las filas dadas: los valores se ponen por el título de su columna. */
async function libroCon(usuario: ClienteApi, filas: Fila[]): Promise<Buffer> {
  const plantilla = (await usuario.get(`${RUTA}/plantilla`)).cuerpo as Buffer;
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(plantilla as unknown as ExcelJS.Buffer);
  const hoja = libro.worksheets[0]!;
  filas.forEach((valores, indice) => {
    hoja.getRow(1).eachCell((celda, columna) => {
      const valor = valores[String(celda.value).replace('*', '').trim()];
      if (valor !== undefined) hoja.getRow(indice + 2).getCell(columna).value = valor as ExcelJS.CellValue;
    });
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const importarFilas = async (filas: Fila[], ensayo = true, usuario = importador) =>
  (
    await usuario.subirImagen('POST', `${RUTA}/importar?ensayo=${ensayo}`, {
      nombreArchivo: 'plazos.xlsx',
      tipoMime: TIPO_EXCEL,
      contenido: await libroCon(usuario, filas),
    })
  ).cuerpo;

const plazoDe = async (proveedorId: string) =>
  (
    await consultar<{ dias_de_credito: number | null; contar_desde_la_recepcion: boolean }>(
      'select dias_de_credito, contar_desde_la_recepcion from cuentas_por_pagar.condiciones_de_proveedor where proveedor_id = $1',
      [proveedorId],
    )
  )[0];

const proveedorDelNit = async (nit: string) =>
  (
    await consultar<{ id: string }>(
      'select p.id from terceros.proveedores p join terceros.terceros t on t.id = p.tercero_id where t.nit = $1',
      [nit],
    )
  )[0]!.id;

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpplazosexcel', MODULOS_DE_CUENTAS_POR_PAGAR);
  const usuario = (nombres: string, acciones: string[]) =>
    crearUsuarioConPermisos(entorno, escenario.cuenta, {
      nombres,
      apellidos: 'Plazos',
      permisos: acciones.map((accion) => `${PERMISOS}.${accion}`),
    });
  importador = await usuario('Importador', ['importar']);
  exportador = await usuario('Exportador', ['exportar']);
  soloVer = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
    nombres: 'Solo ver',
    apellidos: 'Plazos',
    permisos: ['terceros.ver'],
  });
  nitConPlazo = nitValido('9300001');
  nitSinPlazo = nitValido('9300002');
  await registrarProveedor(escenario.cuenta, 'Proveedor con plazo', { nit: nitConPlazo, confirmarDuplicado: true });
  await registrarProveedor(escenario.cuenta, 'Proveedor sin plazo', { nit: nitSinPlazo, confirmarDuplicado: true });
  await registrarProveedor(escenario.cuenta, NOMBRE_REPETIDO, { nit: nitValido('9300003') });
  await registrarProveedor(escenario.cuenta, 'Gemelos Dos, S.A.', {
    nit: nitValido('9300004'),
    confirmarDuplicado: true,
    nombreComercial: NOMBRE_REPETIDO,
  });
  proveedorSinNit = escenario.proveedorId;
});

describe('plantilla, exportar y permisos', () => {
  it('la plantilla trae las cuatro columnas del diseño', async () => {
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await importador.get(`${RUTA}/plantilla`)).cuerpo as unknown as ExcelJS.Buffer);
    const encabezados = (libro.worksheets[0]!.getRow(1).values as unknown[]).slice(1).map(String);

    expect(encabezados.map((titulo) => titulo.replace('*', '').trim())).toEqual([
      'NIT',
      'Proveedor',
      'Días de crédito',
      'Contar desde la recepción',
    ]);
  });

  it('exportar lleva todos los proveedores de la cuenta con su plazo', async () => {
    await importarFilas([{ NIT: nitConPlazo, 'Días de crédito': 15, 'Contar desde la recepción': 'Sí' }], false);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await exportador.get(`${RUTA}/exportar`)).cuerpo as unknown as ExcelJS.Buffer);
    const filas: unknown[][] = [];
    libro.worksheets[0]!.eachRow((fila, numero) => numero > 1 && filas.push((fila.values as unknown[]).slice(1)));

    expect(filas).toContainEqual([nitConPlazo, 'Proveedor con plazo', 15, 'Sí']);
    expect(filas).toContainEqual([nitSinPlazo, 'Proveedor sin plazo', undefined, 'No']);
    expect(filas.length).toBeGreaterThanOrEqual(5);
  });

  it('la lista de plazos la ve quien puede ver proveedores y nadie más', async () => {
    const lista = await soloVer.get(RUTA);
    const filas = lista.cuerpo as Array<{ nit: string | null; proveedorNombre: string }>;

    expect(lista.estado).toBe(200);
    expect(filas.map(({ nit }) => nit)).toEqual(expect.arrayContaining([nitConPlazo, nitSinPlazo]));
    expect((await exportador.get(RUTA)).estado).toBe(403);
  });

  it('plantilla e importar piden importar; exportar pide exportar; ver no da ninguna', async () => {
    const respuestas = [
      await soloVer.get(`${RUTA}/plantilla`),
      await exportador.get(`${RUTA}/plantilla`),
      await importador.get(`${RUTA}/exportar`),
      await soloVer.get(`${RUTA}/exportar`),
    ];

    expect(respuestas.map((respuesta) => respuesta.estado)).toEqual([403, 403, 403, 403]);
  });
});

describe('importar', () => {
  it('el ensayo revisa todo y no guarda nada', async () => {
    const resultado = await importarFilas([{ NIT: nitSinPlazo, 'Días de crédito': 45 }]);

    expect(resultado).toMatchObject({ filas: 1, guardado: false, errores: [] });
    expect(await plazoDe(await proveedorDelNit(nitSinPlazo))).toBeUndefined();
  });

  it('confirmar actualiza por NIT y, sin NIT, por nombre exacto; vacío vuelve al plazo por omisión', async () => {
    const resultado = await importarFilas(
      [
        { NIT: nitSinPlazo, 'Días de crédito': 45, 'Contar desde la recepción': 'Sí' },
        { Proveedor: 'Veterinaria El Quiroa', 'Días de crédito': 0 },
        { NIT: nitConPlazo },
      ],
      false,
    );

    expect(resultado).toMatchObject({ filas: 3, guardado: true, errores: [] });
    expect(await plazoDe(await proveedorDelNit(nitSinPlazo))).toEqual({
      dias_de_credito: 45,
      contar_desde_la_recepcion: true,
    });
    expect(await plazoDe(proveedorSinNit)).toEqual({ dias_de_credito: 0, contar_desde_la_recepcion: false });
    expect(await plazoDe(await proveedorDelNit(nitConPlazo))).toEqual({
      dias_de_credito: null,
      contar_desde_la_recepcion: false,
    });
  });

  it('un nombre que tienen dos proveedores se rechaza y se pide el NIT', async () => {
    const resultado = await importarFilas([{ Proveedor: NOMBRE_REPETIDO, 'Días de crédito': 10 }]);

    expect(resultado.guardado).toBe(false);
    expect(resultado.errores[0]).toMatchObject({ fila: 2, columna: 'Proveedor' });
    expect(resultado.errores[0].mensaje).toContain('Hay varios');
  });

  it('un proveedor que no existe se rechaza y no se crea', async () => {
    const resultado = await importarFilas([
      { NIT: nitValido('9399999'), 'Días de crédito': 10 },
      { Proveedor: 'Nadie, S.A.', 'Días de crédito': 10 },
    ]);

    expect(resultado.errores).toMatchObject([
      { fila: 2, columna: 'NIT' },
      { fila: 3, columna: 'Proveedor' },
    ]);
    expect(await consultar('select 1 from terceros.terceros where nombre_mostrar = $1', ['Nadie, S.A.'])).toEqual([]);
  });

  it('una fila sin NIT ni nombre, o con días fuera de rango, se rechaza', async () => {
    const resultado = await importarFilas([{ 'Días de crédito': 10 }, { NIT: nitConPlazo, 'Días de crédito': 400 }]);

    expect(resultado.errores).toMatchObject([
      { fila: 2, columna: 'NIT' },
      { fila: 3, columna: 'Días de crédito' },
    ]);
  });

  it('el mismo proveedor dos veces en el archivo es error de la segunda fila', async () => {
    const resultado = await importarFilas([
      { NIT: nitConPlazo, 'Días de crédito': 20 },
      { NIT: nitConPlazo, 'Días de crédito': 30 },
    ]);

    expect(resultado.errores).toMatchObject([{ fila: 3, columna: 'NIT' }]);
  });

  it('una fila mala no guarda ninguna, ni la buena', async () => {
    const resultado = await importarFilas(
      [
        { NIT: nitConPlazo, 'Días de crédito': 60 },
        { NIT: nitValido('9399998'), 'Días de crédito': 5 },
      ],
      false,
    );

    expect(resultado.guardado).toBe(false);
    expect(await plazoDe(await proveedorDelNit(nitConPlazo))).toMatchObject({ dias_de_credito: null });
  });

  it('quien solo exporta no puede importar', async () => {
    const respuesta = await exportador.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'plazos.xlsx',
      tipoMime: TIPO_EXCEL,
      contenido: Buffer.from('x'),
    });

    expect(respuesta.estado).toBe(403);
  });
});
