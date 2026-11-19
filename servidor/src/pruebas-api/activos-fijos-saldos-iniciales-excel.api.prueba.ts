/**
 * Saldos iniciales de activos fijos (AF-6): el Excel (plantilla, importar con ensayo, todo o nada, referencias por nombre y
 * por código del padre, exportar) y sus permisos.
 */
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { claseDe, crearUbicaciones } from './soporte/escenario-de-activos.js';
import { datosDeSaldo, fijarFechaDeInicio, SALDOS } from './soporte/escenario-de-saldos-de-activos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let importador: ClienteApi;
let exportador: ClienteApi;

type Fila = Record<string, unknown>;

/** La plantilla con las filas dadas: los valores se ponen por el título de su columna. */
async function libroCon(usuario: ClienteApi, filas: Fila[]): Promise<Buffer> {
  const plantilla = (await usuario.get(`${SALDOS}/plantilla`)).cuerpo as Buffer;
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

const importarFilas = async (filas: Fila[], ensayo: boolean, usuario = importador) =>
  (
    await usuario.subirImagen('POST', `${SALDOS}/importar?ensayo=${ensayo}`, {
      nombreArchivo: 'saldos.xlsx',
      tipoMime: TIPO_EXCEL,
      contenido: await libroCon(usuario, filas),
    })
  ).cuerpo;

const camion = (cambios: Fila = {}): Fila => ({
  Código: 'CAM-01',
  Descripción: 'Camión de reparto',
  Clase: 'Vehículos',
  'Fecha de adquisición': '15/01/2024',
  'Fecha de inicio de uso': '01/02/2024',
  Cantidad: 1,
  Costo: 120000,
  'Depreciación acumulada contable': 50000,
  'Vida útil restante (meses)': 36,
  'Valor residual': 0,
  'Depreciación acumulada fiscal': 72000,
  Localidad: 'FINCA',
  'En bodega': 'Sí',
  ...cambios,
});

const motor = (cambios: Fila = {}): Fila =>
  camion({
    Código: 'MOT-01',
    Descripción: 'Motor',
    'Código del padre': 'CAM-01',
    Costo: 30000,
    'Depreciación acumulada contable': 10000,
    'Vida útil restante (meses)': 24,
    'Depreciación acumulada fiscal': 6000,
    ...cambios,
  });

const cantidadCargada = async () => (await cuenta.propietario.get(SALDOS)).cuerpo.totales.activos as number;

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Saldos Excel', usuario: 'propietariosaldosexcel', modulos });
  await claseDe(cuenta, 'Vehículos');
  await crearUbicaciones(cuenta);
  await fijarFechaDeInicio(cuenta, '2026-03-01');
  const permisos = (accion: string) => [`activos-fijos.saldos-iniciales.${accion}`];
  importador = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Importador',
    apellidos: 'Saldos',
    permisos: permisos('importar'),
  });
  exportador = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Exportador',
    apellidos: 'Saldos',
    permisos: permisos('exportar'),
  });
});

describe('importar', () => {
  it('un ensayo revisa todo y no guarda nada', async () => {
    const resultado = await importarFilas([camion(), motor()], true);

    expect(resultado).toMatchObject({ filas: 2, guardado: false, errores: [] });
    expect(await cantidadCargada()).toBe(0);
  });

  it('con un problema en una fila no se guarda ninguna y se informa la fila y la columna', async () => {
    const resultado = await importarFilas(
      [camion(), motor({ Clase: 'No existe', 'Depreciación acumulada contable': 99999999 })],
      false,
    );

    expect(resultado.guardado).toBe(false);
    expect(resultado.errores).toEqual([expect.objectContaining({ fila: 3, columna: 'Clase' })]);
    expect(await cantidadCargada()).toBe(0);
  });

  it('un padre que no existe, y una regla del dominio, se informan por fila', async () => {
    const resultado = await importarFilas(
      [camion({ 'Depreciación acumulada contable': 130000 }), motor({ 'Código del padre': 'NO-EXISTE' })],
      true,
    );

    expect(resultado.errores.map((e: { fila: number }) => e.fila)).toEqual([2, 3]);
    expect(resultado.errores[1].mensaje).toContain('NO-EXISTE');
  });

  it('carga los activos con su localidad por código y el componente colgado del padre de la fila anterior', async () => {
    const resultado = await importarFilas([camion(), motor()], false);
    const lista = (await cuenta.propietario.get(SALDOS)).cuerpo;

    expect(resultado).toMatchObject({ guardado: true, errores: [] });
    expect(lista.totales).toMatchObject({ activos: 2, costo: '150000.00', valorEnLibros: '90000.00' });
    const [padre, hijo] = lista.saldos;
    expect(padre).toMatchObject({ codigo: 'CAM-01', localidadNombre: 'Finca La Esperanza', enBodega: true });
    expect(hijo).toMatchObject({ codigo: 'MOT-01', activoPadreCodigo: 'CAM-01', activoPadreId: padre.activoId });
  });

  it('repetir un código ya cargado se rechaza en esa fila', async () => {
    const resultado = await importarFilas([camion()], true);

    expect(resultado.errores).toEqual([expect.objectContaining({ fila: 2 })]);
  });
});

describe('exportar y permisos', () => {
  it('exporta los saldos con los mismos títulos de la plantilla', async () => {
    const exportado = await exportador.get(`${SALDOS}/exportar`);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;

    expect(hoja.rowCount).toBe(3);
    expect(hoja.getRow(2).getCell(1).value).toBe('CAM-01');
    expect(String(hoja.getRow(1).getCell(2).value)).toContain('Descripción');
  });

  it('quien solo importa no exporta, quien solo exporta no importa y ninguno de los dos crea a mano', async () => {
    expect((await importador.get(`${SALDOS}/exportar`)).estado).toBe(403);
    expect((await exportador.get(`${SALDOS}/plantilla`)).estado).toBe(403);
    const importacion = await exportador.subirImagen('POST', `${SALDOS}/importar?ensayo=true`, {
      nombreArchivo: 'saldos.xlsx',
      tipoMime: TIPO_EXCEL,
      contenido: Buffer.from('x'),
    });
    expect(importacion.estado).toBe(403);
    expect((await importador.post(SALDOS, datosDeSaldo(crypto.randomUUID()))).estado).toBe(403);
    expect((await importador.get(SALDOS)).estado).toBe(403);
  });
});
