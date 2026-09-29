import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/empresas/localidades';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let importador: ClienteApi;
let nombreDelTipo: string;

/** La plantilla con una fila: los valores se ponen por el título de su columna. */
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
    nombreArchivo: 'localidades.xlsx',
    tipoMime: TIPO_EXCEL,
    contenido,
  });

const filaDeExcel = () => ({
  'Código interno': 'imp-01',
  Nombre: 'Localidad importada',
  Tipo: nombreDelTipo,
  Activo: 'Sí',
});

const cuantas = async (codigo: string) =>
  (await comoPropietario<{ n: string }>('select count(*) n from empresas.localidades where codigo = $1', [codigo]))[0]!
    .n;

const accesosDe = async (codigo: string) =>
  (
    await comoPropietario<{ n: string }>(
      `select count(*) n from empresas.accesos_a_localidades a
       join empresas.localidades l on l.id = a.localidad_id where l.codigo = $1`,
      [codigo],
    )
  )[0]!.n;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Importadora', usuario: 'propietarioimportador' });
  const tipos = (await cuenta.propietario.get('/api/empresas/tipos-de-localidad')).cuerpo as Array<{ nombre: string }>;
  nombreDelTipo = tipos[0]!.nombre;
  importador = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Importador',
    apellidos: 'Sinvertodas',
    permisos: ['ver', 'importar'].map((accion) => `empresas.localidades.${accion}`),
  });
});

describe('importar localidades desde Excel', () => {
  it('el ensayo no guarda nada ni asigna a nadie', async () => {
    const libro = await libroConUnaFila(importador, filaDeExcel());

    const ensayo = await importar(importador, libro, true);

    expect(ensayo.cuerpo).toMatchObject({ guardado: false, errores: [] });
    expect(await cuantas('IMP-01')).toBe('0');
  });

  it('las localidades importadas no se asignan a quien importa: se reparten desde la ventana de accesos', async () => {
    const libro = await libroConUnaFila(importador, filaDeExcel());

    const guardado = await importar(importador, libro, false);

    expect(guardado.cuerpo).toMatchObject({ guardado: true, errores: [] });
    expect(await cuantas('IMP-01')).toBe('1');
    expect(await accesosDe('IMP-01')).toBe('0');
    expect(((await importador.get(RUTA)).cuerpo as unknown[]).length).toBe(0);
  });

  it('un código repetido se informa en el ensayo aunque quien importa no vea la localidad', async () => {
    const libro = await libroConUnaFila(importador, { ...filaDeExcel(), Nombre: 'Otro nombre' });

    const ensayo = await importar(importador, libro, true);

    expect(ensayo.cuerpo.guardado).toBe(false);
    expect(JSON.stringify(ensayo.cuerpo.errores)).toContain('Ya existe una localidad con ese código');
  });

  it('en cambio, la que se registra a mano sí queda asignada a quien la registra', async () => {
    const propietario = cuenta.propietario;
    const creada = await propietario.post(RUTA, {
      codigo: 'MAN-01',
      nombre: 'A mano',
      tipoId: ((await propietario.get('/api/empresas/tipos-de-localidad')).cuerpo as Array<{ id: string }>)[0]!.id,
      codigoEstablecimientoSat: null,
      nombreComercialSat: null,
      departamentoCodigo: null,
      municipioCodigo: null,
      direccion: null,
      activo: true,
    });

    expect(creada.estado).toBe(201);
    expect(await accesosDe('MAN-01')).toBe('1');
  });
});
