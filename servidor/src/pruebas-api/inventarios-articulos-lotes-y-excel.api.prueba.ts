import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';
import { crearReferencias, datosDeArticulo, type ReferenciasDeArticulo } from './inventarios.soporte.js';

const RUTA = '/api/inventarios/articulos';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let otraCuenta: CuentaDePrueba;
let referencias: ReferenciasDeArticulo;

const datos = (cambios: Record<string, unknown> = {}) => datosDeArticulo(referencias, cambios);

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'inventarios'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Lotes y Excel', usuario: 'propietariolotes', modulos });
  otraCuenta = await darDeAltaCuenta(entorno, { nombre: 'Ajena de lotes', usuario: 'propietarioajenolotes', modulos });
  referencias = await crearReferencias(cuenta.propietario);
  await crearReferencias(otraCuenta.propietario);
});

describe('lotes por API', () => {
  it('se registran con su vencimiento y se listan por vencimiento', async () => {
    const articulo = (await cuenta.propietario.post(RUTA, datos({ manejaLotes: true, manejaVencimiento: true }))).cuerpo
      .id;
    await cuenta.propietario.post(`${RUTA}/${articulo}/lotes`, { codigo: 'L-B', fechaDeVencimiento: '2027-06-30' });
    const primero = await cuenta.propietario.post(`${RUTA}/${articulo}/lotes`, {
      codigo: 'L-A',
      fechaDeVencimiento: '2027-01-31',
    });

    const lista = await cuenta.propietario.get(`${RUTA}/${articulo}/lotes`);

    expect(primero.estado).toBe(201);
    expect(lista.cuerpo.map((lote: { codigo: string }) => lote.codigo)).toEqual(['L-A', 'L-B']);
  });

  it('rechaza el lote sin vencimiento si el artículo lo maneja, en un artículo sin lotes y con código repetido', async () => {
    const conVencimiento = (await cuenta.propietario.post(RUTA, datos({ manejaLotes: true, manejaVencimiento: true })))
      .cuerpo.id;
    const sinLotes = (await cuenta.propietario.post(RUTA, datos())).cuerpo.id;
    await cuenta.propietario.post(`${RUTA}/${conVencimiento}/lotes`, {
      codigo: 'L-1',
      fechaDeVencimiento: '2027-01-31',
    });

    const sinFecha = await cuenta.propietario.post(`${RUTA}/${conVencimiento}/lotes`, { codigo: 'L-2' });
    const noManeja = await cuenta.propietario.post(`${RUTA}/${sinLotes}/lotes`, { codigo: 'L-1' });
    const repetido = await cuenta.propietario.post(`${RUTA}/${conVencimiento}/lotes`, {
      codigo: 'l-1',
      fechaDeVencimiento: '2027-02-28',
    });

    expect([sinFecha.estado, noManeja.estado, repetido.estado]).toEqual([400, 400, 409]);
  });

  it('otra cuenta no ve ni toca los lotes ni las conversiones', async () => {
    const articulo = (await cuenta.propietario.post(RUTA, datos({ manejaLotes: true }))).cuerpo.id;

    expect((await otraCuenta.propietario.get(`${RUTA}/${articulo}/lotes`)).estado).toBe(404);
    expect((await otraCuenta.propietario.post(`${RUTA}/${articulo}/lotes`, { codigo: 'X' })).estado).toBe(404);
    expect((await otraCuenta.propietario.get(`${RUTA}/${articulo}/conversiones`)).estado).toBe(404);
  });
});

describe('Excel de artículos', () => {
  async function libroCon(usuario: ClienteApi, valores: Record<string, unknown>): Promise<Buffer> {
    const plantilla = (await usuario.get(`${RUTA}/plantilla`)).cuerpo as Buffer;
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(plantilla as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;
    hoja.getRow(1).eachCell((celda, columna) => {
      const valor = valores[String(celda.value).replace('*', '').trim()];
      if (valor !== undefined) hoja.getRow(2).getCell(columna).value = valor as ExcelJS.CellValue;
    });
    return Buffer.from(await libro.xlsx.writeBuffer());
  }

  const importar = async (valores: Record<string, unknown>, ensayo: boolean) =>
    (
      await cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=${ensayo}`, {
        nombreArchivo: 'articulos.xlsx',
        tipoMime: TIPO_EXCEL,
        contenido: await libroCon(cuenta.propietario, valores),
      })
    ).cuerpo;

  const fila = (codigo: string): Record<string, unknown> => ({
    Código: codigo,
    Nombre: `Importado ${codigo}`,
    Categoría: 'Alimentos',
    'Tipo de inventario': 'Mercadería',
    'Unidad base': 'Libra',
    'Maneja lotes': 'No',
    'Maneja vencimiento': 'No',
    'Concepto de gasto': 'Alimento para animales',
    Activo: 'Sí',
  });

  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    await cuenta.propietario.post(RUTA, datos());
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);

    const revision = await cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'articulos.xlsx',
      tipoMime: TIPO_EXCEL,
      contenido: exportado.cuerpo,
    });

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });

  it('importa con referencias por nombre, incluido el concepto de gasto, y el ensayo no guarda', async () => {
    const ensayo = await importar(fila('IMP-1'), true);
    const antes = await comoPropietario("select 1 from inventarios.articulos where codigo = 'IMP-1'", []);
    const definitivo = await importar(fila('IMP-1'), false);

    expect(ensayo).toMatchObject({ guardado: false });
    expect(antes).toHaveLength(0);
    expect(definitivo).toMatchObject({ guardado: true });
    const guardado = await comoPropietario<{ concepto_de_gasto_id: string }>(
      "select concepto_de_gasto_id from inventarios.articulos where codigo = 'IMP-1'",
      [],
    );
    expect(guardado[0]?.concepto_de_gasto_id).toBe(referencias.conceptoDeGastoId);
  });

  it('un código repetido o una categoría que no existe se informa por fila y no guarda nada', async () => {
    const repetido = await importar(fila('IMP-1'), true);
    const sinCategoria = await importar({ ...fila('IMP-2'), Categoría: 'No existe' }, false);

    expect(repetido).toMatchObject({ guardado: false });
    expect(JSON.stringify(sinCategoria)).toContain('Categoría');
    expect(await comoPropietario("select 1 from inventarios.articulos where codigo = 'IMP-2'", [])).toHaveLength(0);
  });
});

describe('permisos de artículos', () => {
  it('para registrar, eliminar o tocar conversiones y lotes hace falta el permiso de cada acción', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Solo',
      apellidos: 'Lectura',
      permisos: ['inventarios.articulos.ver'],
    });
    const articulo = (await cuenta.propietario.post(RUTA, datos({ manejaLotes: true }))).cuerpo.id;

    expect((await lector.get(RUTA)).estado).toBe(200);
    expect((await lector.get(`${RUTA}/${articulo}/conversiones`)).estado).toBe(200);
    expect((await lector.get(`${RUTA}/${articulo}/lotes`)).estado).toBe(200);
    expect((await lector.post(RUTA, datos())).estado).toBe(403);
    expect((await lector.get(`${RUTA}/codigo-propuesto`)).estado).toBe(403);
    expect((await lector.put(`${RUTA}/${articulo}/conversiones`, { conversiones: [] })).estado).toBe(403);
    expect((await lector.post(`${RUTA}/${articulo}/lotes`, { codigo: 'Z' })).estado).toBe(403);
    expect((await lector.delete(`${RUTA}/${randomUUID()}`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await lector.get(`${RUTA}/plantilla`)).estado).toBe(403);
  });

  it('quien solo ve artículos recibe los conceptos de gasto para elegir, sin necesitar el Libro de compras', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Conceptista',
      apellidos: 'Conceptos',
      permisos: ['inventarios.articulos.ver'],
    });

    const conceptos = await lector.get(`${RUTA}/conceptos-de-gasto`);
    const ajenos = await otraCuenta.propietario.get(`${RUTA}/conceptos-de-gasto`);

    expect(conceptos.cuerpo).toEqual([{ id: referencias.conceptoDeGastoId, nombre: 'Alimento para animales' }]);
    expect(ajenos.cuerpo).toHaveLength(1);
    expect(ajenos.cuerpo[0].id).not.toBe(referencias.conceptoDeGastoId);
  });
});
