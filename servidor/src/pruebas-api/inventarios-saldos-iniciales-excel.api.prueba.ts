/**
 * Saldos iniciales de inventario (INV-7): el Excel (plantilla, importar con ensayo, todo o nada, artículo y bodega por su
 * código, lote creado con su vencimiento, capas de PEPS con su fecha real, exportar) y sus permisos.
 */
import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearArticulo, type EscenarioDeKardex } from './soporte/escenario-de-kardex.js';
import {
  datosDeSaldoInicial,
  prepararSaldos,
  SALDOS_DE_INVENTARIO,
} from './soporte/escenario-de-saldos-de-inventario.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let e: EscenarioDeKardex;
let conLotes: string;
let importador: ClienteApi;
let exportador: ClienteApi;
let codigoDeArticulo: string;
let codigoDeBodega: string;
let codigoConLotes: string;

type Fila = Record<string, unknown>;

/** La plantilla con las filas dadas: los valores se ponen por el título de su columna. */
async function libroCon(usuario: ClienteApi, filas: Fila[]): Promise<Buffer> {
  const plantilla = (await usuario.get(`${SALDOS_DE_INVENTARIO}/plantilla`)).cuerpo as Buffer;
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

const importarFilas = async (filas: Fila[], ensayo: boolean) =>
  (
    await importador.subirImagen('POST', `${SALDOS_DE_INVENTARIO}/importar?ensayo=${ensayo}`, {
      nombreArchivo: 'saldos.xlsx',
      tipoMime: TIPO_EXCEL,
      contenido: await libroCon(importador, filas),
    })
  ).cuerpo;

const fila = (cambios: Fila = {}): Fila => ({
  'Artículo (código)': codigoDeArticulo,
  'Bodega (código)': codigoDeBodega,
  Cantidad: 100,
  'Costo total': 200,
  'Fecha de la capa (compra)': '01/03/2026',
  ...cambios,
});

const cantidadCargada = async () =>
  ((await e.cuenta.propietario.get(SALDOS_DE_INVENTARIO)).cuerpo.saldos as unknown[]).length;

beforeAll(async () => {
  e = await prepararSaldos(entorno, 'saldosexcel', { metodo: 'peps' });
  conLotes = await crearArticulo(e.cuenta.propietario, e.referencias, { manejaLotes: true, manejaVencimiento: true });
  const articulos = (await e.cuenta.propietario.get('/api/inventarios/articulos')).cuerpo as {
    id: string;
    codigo: string;
  }[];
  codigoDeArticulo = articulos.find((a) => a.id === e.articuloId)!.codigo;
  codigoConLotes = articulos.find((a) => a.id === conLotes)!.codigo;
  const bodegas = (await e.cuenta.propietario.get('/api/inventarios/bodegas')).cuerpo as {
    id: string;
    codigo: string;
  }[];
  codigoDeBodega = bodegas.find((b) => b.id === e.bodegaId)!.codigo;
  const crear = (nombres: string, permisos: string[]) =>
    crearUsuarioConPermisos(entorno, e.cuenta, { nombres, apellidos: 'Excel', permisos });
  importador = await crear('Importa', ['inventarios.saldos-iniciales.importar', 'inventarios.bodegas.ver-todas']);
  exportador = await crear('Exporta', ['inventarios.saldos-iniciales.exportar', 'inventarios.bodegas.ver-todas']);
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('importar', () => {
  it('la plantilla trae los títulos de las columnas y las instrucciones', async () => {
    const plantilla = (await importador.get(`${SALDOS_DE_INVENTARIO}/plantilla`)).cuerpo as Buffer;
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(plantilla as unknown as ExcelJS.Buffer);

    const titulos = libro.worksheets[0]!.getRow(1).values as string[];
    expect(titulos.map((t) => String(t).replace('*', '').trim()).filter(Boolean)).toEqual([
      'Artículo (código)',
      'Bodega (código)',
      'Lote',
      'Vencimiento del lote',
      'Cantidad',
      'Unidad',
      'Costo total',
      'Fecha de la capa (compra)',
    ]);
  });

  it('el ensayo revisa todo y no guarda nada', async () => {
    const resultado = await importarFilas([fila()], true);

    expect(resultado).toMatchObject({ guardado: false, errores: [] });
    expect(await cantidadCargada()).toBe(0);
  });

  it('con un problema en una fila no se guarda ninguna y se informa la fila y la columna', async () => {
    const resultado = await importarFilas([fila(), fila({ 'Artículo (código)': 'NO-EXISTE' })], false);

    expect(resultado.guardado).toBe(false);
    expect(resultado.errores).toEqual([expect.objectContaining({ fila: 3, columna: 'Artículo (código)' })]);
    expect(await cantidadCargada()).toBe(0);
  });

  it('una regla del dominio se informa en su fila: capa posterior al inicio, lote sin vencimiento', async () => {
    const resultado = await importarFilas(
      [fila({ 'Fecha de la capa (compra)': '01/09/2026' }), fila({ 'Artículo (código)': codigoConLotes, Lote: 'L-1' })],
      true,
    );

    expect(resultado.errores.map((error: { fila: number }) => error.fila)).toEqual([2, 3]);
  });

  it('carga las filas con sus capas, crea el lote con su vencimiento y lo reutiliza en la fila siguiente', async () => {
    const resultado = await importarFilas(
      [
        fila(),
        fila({ Cantidad: 50, 'Costo total': 115, 'Fecha de la capa (compra)': '01/08/2026' }),
        fila({
          'Artículo (código)': codigoConLotes,
          Lote: 'L-1',
          'Vencimiento del lote': '31/12/2026',
          Cantidad: 10,
          'Costo total': 30,
        }),
        fila({ 'Artículo (código)': codigoConLotes, Lote: 'l-1', Cantidad: 5, 'Costo total': 15 }),
      ],
      false,
    );

    expect(resultado, JSON.stringify(resultado)).toMatchObject({ guardado: true, errores: [] });
    const lista = (await e.cuenta.propietario.get(SALDOS_DE_INVENTARIO)).cuerpo;
    expect(lista.totales).toMatchObject({ renglones: 4, articulos: 2, valor: '360.00' });
    const lotes = await comoPropietario<{ codigo: string; fecha_de_vencimiento: string }>(
      `select codigo, fecha_de_vencimiento::text from inventarios.lotes where articulo_id = $1`,
      [conLotes],
    );
    expect(lotes).toEqual([{ codigo: 'L-1', fecha_de_vencimiento: '2026-12-31' }]);
    const capas = await comoPropietario<{ fecha: string }>(
      `select fecha::text from inventarios.capas where articulo_id = $1 order by fecha`,
      [e.articuloId],
    );
    expect(capas.map((c) => c.fecha)).toEqual(['2026-03-01', '2026-08-01']);
  });

  it('el lote existente con otro vencimiento se rechaza en su fila', async () => {
    const resultado = await importarFilas(
      [fila({ 'Artículo (código)': codigoConLotes, Lote: 'L-1', 'Vencimiento del lote': '01/01/2027' })],
      true,
    );

    expect(resultado.errores).toEqual([expect.objectContaining({ fila: 2 })]);
  });
});

describe('exportar y permisos', () => {
  it('exporta los saldos con los mismos títulos de la plantilla', async () => {
    const exportado = await exportador.get(`${SALDOS_DE_INVENTARIO}/exportar`);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;

    expect(hoja.rowCount).toBe(5);
    expect(hoja.getRow(2).getCell(1).value).toBe(codigoDeArticulo);
    expect(hoja.getRow(2).getCell(2).value).toBe(codigoDeBodega);
  });

  it('quien solo importa no exporta, quien solo exporta no importa y ninguno de los dos crea ni ve a mano', async () => {
    expect((await importador.get(`${SALDOS_DE_INVENTARIO}/exportar`)).estado).toBe(403);
    expect((await exportador.get(`${SALDOS_DE_INVENTARIO}/plantilla`)).estado).toBe(403);
    const importacion = await exportador.subirImagen('POST', `${SALDOS_DE_INVENTARIO}/importar?ensayo=true`, {
      nombreArchivo: 'saldos.xlsx',
      tipoMime: TIPO_EXCEL,
      contenido: Buffer.from('x'),
    });
    expect(importacion.estado).toBe(403);
    expect((await importador.post(SALDOS_DE_INVENTARIO, datosDeSaldoInicial(e, '1', '1.00'))).estado).toBe(403);
    expect((await importador.get(SALDOS_DE_INVENTARIO)).estado).toBe(403);
  });
});
