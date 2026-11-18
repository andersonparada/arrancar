import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/empresas';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let importador: ClienteApi;
let sinPermisos: ClienteApi;

/** La plantilla con una fila: los valores se ponen por el título de su columna. */
async function libroConUnaFila(usuario: ClienteApi, valores: Record<string, unknown>): Promise<Buffer> {
  const plantilla = (await usuario.get(`${RUTA}/plantilla`)).cuerpo as Buffer;
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(plantilla as unknown as ExcelJS.Buffer);
  const hoja = libro.worksheets[0]!;
  hoja.getRow(1).eachCell((celda, columna) => {
    const valor = valores[String(celda.value).replace(/\s*\*$/, '')];
    if (valor !== undefined) hoja.getRow(2).getCell(columna).value = valor as ExcelJS.CellValue;
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const importar = (usuario: ClienteApi, contenido: Buffer, ensayo: boolean) =>
  usuario.subirImagen('POST', `${RUTA}/importar?ensayo=${ensayo}`, {
    nombreArchivo: 'empresas.xlsx',
    tipoMime: TIPO_EXCEL,
    contenido,
  });

const fila = (nombre: string, otros: Record<string, unknown> = {}) => ({
  Nombre: nombre,
  Correo: 'info@importada.test',
  Activa: 'Sí',
  ...otros,
});

const empresasLlamadas = (nombre: string) =>
  comoPropietario<{ id: string }>('select id from core.empresas where nombre = $1', [nombre]);

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Importadora de empresas', usuario: 'impempresas' });
  importador = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Importa',
    apellidos: 'Empresas',
    permisos: ['empresas.ver', 'empresas.importar', 'empresas.exportar'],
  });
  sinPermisos = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Solo',
    apellidos: 'Ve',
    permisos: ['empresas.ver'],
  });
});

describe('importar empresas desde Excel', () => {
  it('el ensayo no guarda nada', async () => {
    const libro = await libroConUnaFila(importador, fila('Empresa de ensayo'));

    const ensayo = await importar(importador, libro, true);

    expect(ensayo.cuerpo).toMatchObject({ guardado: false, errores: [] });
    expect(await empresasLlamadas('Empresa de ensayo')).toHaveLength(0);
  });

  it('crea la empresa con lo mismo que el formulario: acceso de quien importa y tipos de localidad iniciales', async () => {
    const libro = await libroConUnaFila(importador, fila('Empresa importada', { NIT: '1234567-9' }));

    const guardado = await importar(importador, libro, false);

    expect(guardado.cuerpo).toMatchObject({ guardado: true, errores: [] });
    const [empresa] = await empresasLlamadas('Empresa importada');
    const tipos = await comoPropietario<{ n: string }>(
      'select count(*) n from empresas.tipos_de_localidad where empresa_id = $1',
      [empresa!.id],
    );
    const accesos = await comoPropietario<{ n: string }>(
      'select count(*) n from core.empresa_usuarios where empresa_id = $1',
      [empresa!.id],
    );
    expect(Number(tipos[0]!.n)).toBeGreaterThan(0);
    expect(accesos[0]!.n).toBe('1');
    const sesion = await importador.get('/api/sesion');
    expect(sesion.cuerpo.empresasDisponibles.map((e: { id: string }) => e.id)).toContain(empresa!.id);
  });

  it('si una fila falla no se guarda ninguna empresa', async () => {
    const libro = await libroConUnaFila(importador, fila('Empresa con NIT malo', { NIT: '12345678' }));

    const respuesta = await importar(importador, libro, false);

    expect(respuesta.cuerpo.guardado).toBe(false);
    expect(JSON.stringify(respuesta.cuerpo.errores)).toContain('NIT');
    expect(await empresasLlamadas('Empresa con NIT malo')).toHaveLength(0);
  });

  it('sin el permiso de importar responde 403 en la plantilla y en importar', async () => {
    const plantilla = await sinPermisos.get(`${RUTA}/plantilla`);
    const libro = await libroConUnaFila(importador, fila('Empresa sin permiso'));
    const respuesta = await importar(sinPermisos, libro, false);

    expect(plantilla.estado).toBe(403);
    expect(respuesta.estado).toBe(403);
    expect(await empresasLlamadas('Empresa sin permiso')).toHaveLength(0);
  });
});

describe('exportar empresas a Excel', () => {
  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    const exportado = await importador.get(`${RUTA}/exportar`);

    const revision = await importar(importador, exportado.cuerpo as Buffer, true);

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });

  it('sin el permiso de exportar responde 403', async () => {
    const respuesta = await sinPermisos.get(`${RUTA}/exportar`);

    expect(respuesta.estado).toBe(403);
  });
});
