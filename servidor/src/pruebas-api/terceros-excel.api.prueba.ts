import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CLIENTES = '/api/terceros/clientes';
const PROVEEDORES = '/api/terceros/proveedores';
const CATEGORIAS = '/api/proveedores/categorias';
const NIT_VALIDO = '12345679';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let importador: ClienteApi;
let soloVer: ClienteApi;

/** La plantilla con filas: los valores se ponen por el título de su columna. */
async function libroCon(usuario: ClienteApi, ruta: string, filas: Record<string, unknown>[]): Promise<Buffer> {
  const plantilla = (await usuario.get(`${ruta}/plantilla`)).cuerpo as Buffer;
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(plantilla as unknown as ExcelJS.Buffer);
  const hoja = libro.worksheets[0]!;
  filas.forEach((valores, indice) => {
    hoja.getRow(1).eachCell((celda, columna) => {
      const valor = valores[String(celda.value).replace(/\s*\*$/, '')];
      if (valor !== undefined) hoja.getRow(indice + 2).getCell(columna).value = valor as ExcelJS.CellValue;
    });
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const importar = (usuario: ClienteApi, ruta: string, { contenido, ensayo }: { contenido: Buffer; ensayo: boolean }) =>
  usuario.subirImagen('POST', `${ruta}/importar?ensayo=${ensayo}`, {
    nombreArchivo: 'datos.xlsx',
    tipoMime: TIPO_EXCEL,
    contenido,
  });

const ensayar = (usuario: ClienteApi, ruta: string, contenido: Buffer) =>
  importar(usuario, ruta, { contenido, ensayo: true });

const guardar = (usuario: ClienteApi, ruta: string, contenido: Buffer) =>
  importar(usuario, ruta, { contenido, ensayo: false });

const cliente = (cambios: Record<string, unknown> = {}) => ({
  Tipo: 'Persona individual',
  Nombres: 'Ana',
  Apellidos: 'Importada',
  'Clase de cliente': 'Directo',
  Activo: 'Sí',
  ...cambios,
});

const cuantos = async (nombre: string) =>
  (
    await comoPropietario<{ n: string }>('select count(*) n from terceros.terceros where nombre_mostrar = $1', [nombre])
  )[0]!.n;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, {
    nombre: 'Excel Terceros',
    usuario: 'propietarioexcelterceros',
    modulos: ['terceros'],
  });
  const permisos = ['clientes', 'proveedores', 'categorias-de-proveedor'].flatMap((r) => [
    `terceros.${r}.importar`,
    `terceros.${r}.exportar`,
  ]);
  importador = await crearUsuarioConPermisos(entorno, cuenta, { nombres: 'Importa', apellidos: 'Todo', permisos });
  soloVer = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Viendo',
    permisos: ['terceros.ver'],
  });
});

describe('Excel de clientes', () => {
  it('el ensayo no guarda nada', async () => {
    const libro = await libroCon(importador, CLIENTES, [cliente()]);

    const ensayo = await ensayar(importador, CLIENTES, libro);

    expect(ensayo.cuerpo).toMatchObject({ guardado: false, errores: [] });
    expect(await cuantos('Ana Importada')).toBe('0');
  });

  it('importa y lo importado sale al exportar', async () => {
    const libro = await libroCon(importador, CLIENTES, [cliente({ NIT: NIT_VALIDO })]);

    const guardado = await guardar(importador, CLIENTES, libro);
    const exportado = await importador.get(`${CLIENTES}/exportar`);

    expect(guardado.cuerpo).toMatchObject({ guardado: true, errores: [] });
    expect(await cuantos('Ana Importada')).toBe('1');
    expect(exportado.estado).toBe(200);
    expect((exportado.cuerpo as Buffer).subarray(0, 2).toString()).toBe('PK');
  });

  it('un tercero parecido (mismo NIT) se informa en el ensayo', async () => {
    const libro = await libroCon(importador, CLIENTES, [cliente({ Nombres: 'Otra', NIT: NIT_VALIDO })]);

    const ensayo = await ensayar(importador, CLIENTES, libro);

    expect(ensayo.cuerpo.guardado).toBe(false);
    expect(ensayo.cuerpo.errores).toHaveLength(1);
  });

  it('informa los errores por fila y columna y no guarda nada si una falla (todo o nada)', async () => {
    const libro = await libroCon(importador, CLIENTES, [
      cliente({ Nombres: 'Buena', Apellidos: 'Fila' }),
      cliente({ Nombres: 'Mala', Apellidos: 'Fila', 'Clase de cliente': 'Inventada' }),
    ]);

    const guardado = await guardar(importador, CLIENTES, libro);

    expect(guardado.cuerpo.guardado).toBe(false);
    const errores = guardado.cuerpo.errores as Array<{ fila: number; columna: string }>;
    expect(errores.every((e) => e.fila === 3)).toBe(true);
    expect(errores.map((e) => e.columna)).toEqual(['Clase de cliente']);
    expect(await cuantos('Buena Fila')).toBe('0');
  });
});

describe('Excel de proveedores', () => {
  beforeAll(async () => {
    await cuenta.propietario.post(CATEGORIAS, { nombre: 'Veterinarios', activo: true });
  });

  it('importa con la categoría escrita por su nombre', async () => {
    const libro = await libroCon(importador, PROVEEDORES, [
      { Tipo: 'Persona jurídica', 'Razón social': 'Veterinaria Zeta, S.A.', Categoría: 'Veterinarios' },
    ]);

    const guardado = await guardar(importador, PROVEEDORES, libro);
    const listado = (await cuenta.propietario.get('/api/terceros?papel=proveedor')).cuerpo as Array<any>;

    expect(guardado.cuerpo).toMatchObject({ guardado: true, errores: [] });
    expect(listado.find((t) => t.razonSocial === 'Veterinaria Zeta, S.A.').proveedor.categoriaNombre).toBe(
      'Veterinarios',
    );
  });

  it('una categoría inexistente se informa en su columna', async () => {
    const libro = await libroCon(importador, PROVEEDORES, [
      { Tipo: 'Persona jurídica', 'Razón social': 'Cosechadora Omega, S.A.', Categoría: 'No existe' },
    ]);

    const ensayo = await ensayar(importador, PROVEEDORES, libro);

    expect(ensayo.cuerpo.guardado).toBe(false);
    expect(ensayo.cuerpo.errores).toEqual([expect.objectContaining({ fila: 2, columna: 'Categoría' })]);
  });

  it('exporta solo a los proveedores', async () => {
    const exportado = await importador.get(`${PROVEEDORES}/exportar`);

    expect(exportado.estado).toBe(200);
  });
});

describe('Excel de categorías de proveedor', () => {
  it('importa y detecta repetidos', async () => {
    const libro = await libroCon(importador, CATEGORIAS, [{ Nombre: 'Alimentos', Activo: 'Sí' }]);

    const guardado = await guardar(importador, CATEGORIAS, libro);
    const repetido = await ensayar(importador, CATEGORIAS, libro);

    expect(guardado.cuerpo).toMatchObject({ guardado: true, errores: [] });
    expect(repetido.cuerpo.guardado).toBe(false);
    expect(repetido.cuerpo.errores).toHaveLength(1);
  });

  it('exporta las categorías', async () => {
    expect((await importador.get(`${CATEGORIAS}/exportar`)).estado).toBe(200);
  });
});

describe('permisos del Excel de terceros', () => {
  it.each([CLIENTES, PROVEEDORES, CATEGORIAS])(
    'ver no basta para exportar, bajar la plantilla ni importar: %s',
    async (ruta) => {
      const libro = await libroCon(importador, ruta, []);

      expect((await soloVer.get(`${ruta}/exportar`)).estado).toBe(403);
      expect((await soloVer.get(`${ruta}/plantilla`)).estado).toBe(403);
      expect((await ensayar(soloVer, ruta, libro)).estado).toBe(403);
    },
  );
});
