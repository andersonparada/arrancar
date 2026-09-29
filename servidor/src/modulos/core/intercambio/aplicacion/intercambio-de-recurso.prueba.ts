import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { ContextoEmpresa } from '../../compartido/aplicacion/contexto-empresa.js';
import { RecursoDuplicado } from '../../compartido/aplicacion/errores.js';
import type { UnidadDeTrabajo } from '../../compartido/aplicacion/unidad-de-trabajo.js';
import { operadorDePrueba } from '../../compartido/pruebas/dobles-compartidos.js';
import { validadorDeZod } from '../http/rutas-de-intercambio.js';
import { LibroDeExcelJs } from '../infraestructura/libro-de-excel.exceljs.js';
import type { Columna } from './columnas.js';
import { ArchivoNoEsExcel } from './errores.js';
import { IntercambioDeRecurso } from './intercambio-de-recurso.js';

interface Animal {
  arete: string;
  nacimiento: string | null;
  potreroId: string | null;
  potreroNombre?: string | null;
}

const esquema = z.object({
  arete: z.string().min(3, 'El arete tiene al menos 3 caracteres.'),
  nacimiento: z.string().nullable(),
  potreroId: z.string().nullable(),
});

const COLUMNAS: Columna[] = [
  { clave: 'arete', titulo: 'Arete', requerido: true, tipo: 'texto' },
  { clave: 'nacimiento', titulo: 'Nacimiento', requerido: false, tipo: 'fecha' },
  {
    clave: 'potreroId',
    titulo: 'Potrero',
    requerido: false,
    tipo: 'referencia',
    campoDeNombre: 'potreroNombre',
    opciones: async () => [{ id: 'p1', nombre: 'La Ceiba' }],
  },
];

/** Una unidad de trabajo que deshace lo guardado si el trabajo falla, como una transacción. */
class UnidadQueDeshace implements UnidadDeTrabajo {
  constructor(private readonly guardados: Animal[]) {}

  async ejecutar<Resultado>(_contexto: ContextoEmpresa, trabajo: () => Promise<Resultado>): Promise<Resultado> {
    const antes = [...this.guardados];
    try {
      return await trabajo();
    } catch (error) {
      this.guardados.splice(0, this.guardados.length, ...antes);
      throw error;
    }
  }
}

const libro = new LibroDeExcelJs();
const operador = operadorDePrueba();
let guardados: Animal[];
let intercambio: IntercambioDeRecurso<Animal, Animal>;

const excelCon = (filas: unknown[][]) =>
  libro.escribir({ nombre: 'Animales', encabezados: ['Arete', 'Nacimiento', 'Potrero'], filas, instrucciones: [] });

beforeEach(() => {
  guardados = [];
  intercambio = new IntercambioDeRecurso<Animal, Animal>({
    nombre: 'Animales',
    columnas: COLUMNAS,
    libro,
    unidadDeTrabajo: new UnidadQueDeshace(guardados),
    validar: validadorDeZod(esquema),
    listar: async () => guardados,
    crear: async (_operador, animal) => {
      if (guardados.some((guardado) => guardado.arete === animal.arete))
        throw new RecursoDuplicado('Ese arete ya existe.');
      guardados.push(animal);
    },
    interpretarError: () => null,
  });
});

describe('importar', () => {
  it('guarda todas las filas, con las fechas y las referencias convertidas', async () => {
    const archivo = await excelCon([
      ['GT-01', '15/03/2024', 'La Ceiba'],
      ['GT-02', null, null],
    ]);

    const resultado = await intercambio.importar(operador, { contenido: archivo, ensayo: false });

    expect(resultado).toEqual({ filas: 2, guardado: true, errores: [] });
    expect(guardados).toEqual([
      { arete: 'GT-01', nacimiento: '2024-03-15', potreroId: 'p1' },
      { arete: 'GT-02', nacimiento: null, potreroId: null },
    ]);
  });

  it('el ensayo revisa todo y no guarda nada', async () => {
    const resultado = await intercambio.importar(operador, { contenido: await excelCon([['GT-01']]), ensayo: true });

    expect(resultado).toEqual({ filas: 1, guardado: false, errores: [] });
    expect(guardados).toEqual([]);
  });

  it('informa todos los problemas de celdas y del esquema, con su fila y columna, sin guardar nada', async () => {
    const archivo = await excelCon([
      ['GT-01', '31/02/2024', 'Las Flores'],
      ['G1', null, null],
    ]);

    const { errores, guardado } = await intercambio.importar(operador, { contenido: archivo, ensayo: false });

    expect(guardado).toBe(false);
    expect(errores).toEqual([
      { fila: 2, columna: 'Nacimiento', mensaje: 'Esa fecha no existe.' },
      { fila: 2, columna: 'Potrero', mensaje: 'No existe "Las Flores" en Potrero.' },
      { fila: 3, columna: 'Arete', mensaje: 'El arete tiene al menos 3 caracteres.' },
    ]);
    expect(guardados).toEqual([]);
  });

  it('si una regla rechaza una fila, deshace las anteriores e indica cuál fue', async () => {
    const archivo = await excelCon([['GT-01'], ['GT-01']]);

    const resultado = await intercambio.importar(operador, { contenido: archivo, ensayo: false });

    expect(resultado.errores).toEqual([{ fila: 3, columna: null, mensaje: 'Ese arete ya existe.' }]);
    expect(guardados).toEqual([]);
  });

  it('avisa si falta una columna obligatoria o el archivo no es un Excel', async () => {
    const sinArete = await libro.escribir({
      nombre: 'x',
      encabezados: ['Potrero'],
      filas: [['La Ceiba']],
      instrucciones: [],
    });

    expect((await intercambio.importar(operador, { contenido: sinArete, ensayo: true })).errores).toEqual([
      { fila: 1, columna: 'Arete', mensaje: 'Falta esta columna.' },
    ]);
    await expect(intercambio.importar(operador, { contenido: Buffer.from('hola'), ensayo: true })).rejects.toThrow(
      ArchivoNoEsExcel,
    );
  });
});

describe('exportar', () => {
  it('lo exportado se puede volver a importar tal cual', async () => {
    guardados.push({ arete: 'GT-07', nacimiento: '2024-03-15', potreroId: 'p1', potreroNombre: 'La Ceiba' });
    const exportado = await intercambio.exportar(operador);
    guardados.splice(0);

    await intercambio.importar(operador, { contenido: exportado, ensayo: false });

    expect(guardados).toEqual([{ arete: 'GT-07', nacimiento: '2024-03-15', potreroId: 'p1' }]);
  });
});

describe('recursos con alcance por registro', () => {
  const operadores: boolean[] = [];

  function intercambioQueRecuerda(sinAsignarAlCrear?: boolean) {
    operadores.splice(0);
    return new IntercambioDeRecurso<Animal, Animal>({
      nombre: 'Animales',
      columnas: COLUMNAS,
      libro,
      unidadDeTrabajo: new UnidadQueDeshace(guardados),
      validar: validadorDeZod(esquema),
      listar: async () => guardados,
      crear: async (quien) => void operadores.push(Boolean(quien.sinAsignarAlCrear)),
      interpretarError: () => null,
      sinAsignarAlCrear,
    });
  }

  it('al importar y al ensayar, el operador lleva sinAsignarAlCrear si el recurso lo pide', async () => {
    const contenido = await excelCon([['GT-01', null, null]]);

    await intercambioQueRecuerda(true).importar(operador, { contenido, ensayo: true });
    await intercambioQueRecuerda(true).importar(operador, { contenido, ensayo: false });

    expect(operadores).toEqual([true]);
  });

  it('sin pedirlo, el operador queda como llegó', async () => {
    const contenido = await excelCon([['GT-01', null, null]]);

    await intercambioQueRecuerda().importar(operador, { contenido, ensayo: false });

    expect(operadores).toEqual([false]);
  });
});
