/**
 * Excel de los saldos iniciales (U8-5): plantilla con sus instrucciones, exportar, importar con ensayo, todo o nada,
 * repetidos, proveedor por NIT o por nombre, carga cerrada y retenciones vacías.
 */
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/cuentas-por-pagar.contratos.js';
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

const RUTA = '/api/cuentas-por-pagar/saldos-iniciales';
const CARGA = (empresaId: string) => `/api/empresas/${empresaId}/carga-inicial`;
const PERMISOS = 'cuentas-por-pagar.saldos-iniciales';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let importador: ClienteApi;
let exportador: ClienteApi;
let soloVer: ClienteApi;
let nitConNombreRepetido: string;
const NOMBRE_REPETIDO = 'Gemelos del Norte, S.A.';

type Fila = Record<string, unknown>;

const propietario = () => escenario.cuenta.propietario;
const filaBuena = (cambios: Fila = {}): Fila => ({
  Proveedor: 'Veterinaria El Quiroa',
  Tipo: 'Factura',
  Serie: 'A',
  Número: '9001',
  'Referencia del sistema anterior': 'CXP-1',
  'Fecha de emisión': '20/12/2025',
  Vencimiento: '20/01/2026',
  Total: 1120,
  'Retenciones (todas)': 120,
  'Retenciones por practicar': 20,
  'Saldo pendiente': 700,
  'Activo fijo': 'No',
  ...cambios,
});

/** La plantilla con las filas dadas: los valores se ponen por el título de su columna. */
async function libroCon(usuario: ClienteApi, filas: Fila[]): Promise<Buffer> {
  const plantilla = (await usuario.get(`${RUTA}/plantilla`)).cuerpo as Buffer;
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(plantilla as unknown as ExcelJS.Buffer);
  const hoja = libro.worksheets[0]!;
  filas.forEach((valores, indice) => {
    hoja.getRow(1).eachCell((celda, columna) => {
      const valor = valores[String(celda.value)];
      if (valor !== undefined) hoja.getRow(indice + 2).getCell(columna).value = valor as ExcelJS.CellValue;
    });
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const importar = (usuario: ClienteApi, contenido: Buffer, ensayo: boolean) =>
  usuario.subirImagen('POST', `${RUTA}/importar?ensayo=${ensayo}`, {
    nombreArchivo: 'saldos.xlsx',
    tipoMime: TIPO_EXCEL,
    contenido,
  });

const importarFilas = async (filas: Fila[], ensayo = true, usuario = importador) =>
  (await importar(usuario, await libroCon(usuario, filas), ensayo)).cuerpo;

const cuantos = async (numero: string) =>
  Number(
    (
      await consultar<{ n: string }>(
        `select count(*) n from cuentas_por_pagar.documentos where origen = 'saldo_inicial' and numero = $1 and empresa_id = $2`,
        [numero, escenario.cuenta.empresaId],
      )
    )[0]!.n,
  );

const leerLibro = async (contenido: Buffer) => {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(contenido as unknown as ExcelJS.Buffer);
  return libro;
};

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpsaldosexcel', MODULOS_DE_CUENTAS_POR_PAGAR);
  const usuario = (nombres: string, acciones: string[]) =>
    crearUsuarioConPermisos(entorno, escenario.cuenta, {
      nombres,
      apellidos: 'Excel',
      permisos: acciones.map((accion) => `${PERMISOS}.${accion}`),
    });
  importador = await usuario('Importador', ['ver', 'crear', 'importar']);
  exportador = await usuario('Exportador', ['exportar']);
  soloVer = await usuario('Solo ver', ['ver']);
  await propietario().put(CARGA(escenario.cuenta.empresaId), { fechaDeInicio: '2026-01-01' });
  nitConNombreRepetido = nitValido('9100001');
  await registrarProveedor(escenario.cuenta, NOMBRE_REPETIDO, { nit: nitConNombreRepetido });
  await registrarProveedor(escenario.cuenta, 'Gemelos Dos, S.A.', {
    nit: nitValido('9100002'),
    confirmarDuplicado: true,
    nombreComercial: NOMBRE_REPETIDO,
  });
});

describe('plantilla y permisos', () => {
  it('la plantilla trae las columnas del formulario y la hoja de instrucciones con los textos del contador', async () => {
    const libro = await leerLibro((await importador.get(`${RUTA}/plantilla`)).cuerpo as Buffer);
    const encabezados = (libro.worksheets[0]!.getRow(1).values as unknown[]).slice(1).map(String);
    const instrucciones: string[] = [];
    libro.worksheets[1]!.eachRow((fila) => instrucciones.push(String(fila.getCell(1).value ?? '')));

    expect(encabezados.map((titulo) => titulo.replace('*', '').trim())).toEqual([
      'Proveedor',
      'Tipo',
      'Serie',
      'Número',
      'Referencia del sistema anterior',
      'Fecha de emisión',
      'Vencimiento',
      'Total',
      'Retenciones (todas)',
      'Retenciones por practicar',
      'Saldo pendiente',
      'Activo fijo',
    ]);
    expect(instrucciones.some((texto) => texto.startsWith('Cargue solo los documentos registrados'))).toBe(true);
    expect(instrucciones.some((texto) => texto.includes('Un anticipo a proveedor no es una nota de crédito'))).toBe(
      true,
    );
    expect(instrucciones).toContain('Solo quetzales.');
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
    const resultado = await importarFilas([filaBuena({ Número: '9101' })]);

    expect(resultado).toMatchObject({ filas: 1, guardado: false, errores: [] });
    expect(await cuantos('9101')).toBe(0);
  });

  it('confirmar guarda; las retenciones por practicar vacías valen cero y el proveedor se halla por su NIT', async () => {
    const resultado = await importarFilas(
      [
        filaBuena({ Número: '9102', 'Retenciones por practicar': undefined, 'Retenciones (todas)': undefined }),
        filaBuena({ Número: '9103', Proveedor: nitConNombreRepetido, 'Saldo pendiente': 1000 }),
      ],
      false,
    );
    const filas = await consultar<{ numero: string; retenciones_por_practicar: string; retenciones: string }>(
      `select numero, retenciones_por_practicar::text, retenciones::text from cuentas_por_pagar.documentos
       where numero in ('9102', '9103') and empresa_id = $1 order by numero`,
      [escenario.cuenta.empresaId],
    );

    expect(resultado).toMatchObject({ filas: 2, guardado: true, errores: [] });
    expect(filas).toEqual([
      { numero: '9102', retenciones_por_practicar: '0.00', retenciones: '0.00' },
      { numero: '9103', retenciones_por_practicar: '20.00', retenciones: '120.00' },
    ]);
  });

  it('un nombre que tienen dos proveedores se rechaza y se pide el NIT', async () => {
    const resultado = await importarFilas([filaBuena({ Número: '9104', Proveedor: NOMBRE_REPETIDO })]);

    expect(resultado.guardado).toBe(false);
    expect(resultado.errores[0]).toMatchObject({ fila: 2, columna: 'Proveedor' });
    expect(resultado.errores[0].mensaje).toContain('Hay varios');
  });

  it('una fila mala no guarda ninguna, ni la buena', async () => {
    const resultado = await importarFilas(
      [filaBuena({ Número: '9105' }), filaBuena({ Número: '9106', Total: 'mucho' })],
      false,
    );

    expect(resultado).toMatchObject({ guardado: false });
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0]).toMatchObject({ fila: 3, columna: 'Total' });
    expect(await cuantos('9105')).toBe(0);
  });

  it('una fila que rompe una regla del dominio se informa con su fila y no guarda nada', async () => {
    const resultado = await importarFilas(
      [filaBuena({ Número: '9107' }), filaBuena({ Número: '9108', 'Saldo pendiente': 5000 })],
      false,
    );

    expect(resultado.guardado).toBe(false);
    expect(resultado.errores[0]).toMatchObject({ fila: 3, columna: 'Saldo pendiente' });
    expect(await cuantos('9107')).toBe(0);
  });

  it('el mismo documento dos veces en el archivo, o ya cargado, se rechaza', async () => {
    const dentro = await importarFilas([filaBuena({ Número: '9109' }), filaBuena({ Número: '9109' })]);
    const contraLoCargado = await importarFilas([filaBuena({ Número: '9102' })]);

    expect(dentro).toMatchObject({ guardado: false, errores: [{ fila: 3 }] });
    expect(dentro.errores[0].mensaje).toContain('ya está en Cuentas por pagar');
    expect(dentro.errores[0].columna).toBe('Número');
    expect(contraLoCargado).toMatchObject({ guardado: false, errores: [{ fila: 2 }] });
    expect(await cuantos('9109')).toBe(0);
  });
});

describe('avisos del ensayo', () => {
  it('sin vencimiento en la fila, el ensayo muestra el propuesto; con vencimiento, no avisa', async () => {
    const sin = await importarFilas([filaBuena({ Número: '9120', Vencimiento: null })]);
    const con = await importarFilas([filaBuena({ Número: '9121' })]);

    expect(sin.errores).toEqual([]);
    expect(sin.avisos).toEqual([
      expect.objectContaining({ fila: 2, columna: 'Vencimiento', mensaje: expect.stringContaining('Se propone') }),
    ]);
    expect(con.avisos).toBeUndefined();
  });

  it('la hoja de instrucciones dice que el código del proveedor es el NIT y da una fecha de ejemplo', async () => {
    const plantilla = (await importador.get(`${RUTA}/plantilla`)).cuerpo as Buffer;
    const hoja = (await leerLibro(plantilla)).worksheets[1]!;
    const texto: string[] = [];
    hoja.eachRow((fila) => texto.push(String(fila.getCell(1).value)));

    expect(texto.join('\n')).toContain('el código del proveedor es su NIT');
    expect(texto.join('\n')).toContain('15/03/2025');
  });
});

describe('exportar y la carga cerrada', () => {
  it('exportar trae lo cargado con los mismos títulos que la plantilla', async () => {
    const respuesta = await exportador.get(`${RUTA}/exportar`);
    const hoja = (await leerLibro(respuesta.cuerpo as Buffer)).worksheets[0]!;
    const numeros: string[] = [];
    hoja.eachRow((fila, indice) => indice > 1 && numeros.push(String(fila.getCell(4).value)));

    expect(respuesta.estado).toBe(200);
    expect(numeros).toEqual(expect.arrayContaining(['9102', '9103']));
  });

  it('con la carga cerrada el ensayo informa la fila y no guarda', async () => {
    await propietario().post(`${CARGA(escenario.cuenta.empresaId)}/cerrar`, {});

    const resultado = await importarFilas([filaBuena({ Número: '9110' })], false);

    expect(resultado).toMatchObject({ guardado: false, errores: [{ fila: 2 }] });
    expect(await cuantos('9110')).toBe(0);
  });
});
