import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/empresas/departamentos';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let localidadId: string;

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Importadora', usuario: 'propietarioimportador' });
  const tipos = (await cuenta.propietario.get('/api/empresas/tipos-de-localidad')).cuerpo as Array<{ id: string }>;
  const creada = await cuenta.propietario.post('/api/empresas/localidades', {
    codigo: 'PRO-1',
    nombre: 'Localidad PRO-1',
    tipoId: tipos[0]!.id,
    codigoEstablecimientoSat: null,
    nombreComercialSat: null,
    departamentoCodigo: null,
    municipioCodigo: null,
    direccion: null,
    activo: true,
  });
  localidadId = creada.cuerpo.id as string;
});

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
    nombreArchivo: 'departamentos.xlsx',
    tipoMime: TIPO_EXCEL,
    contenido,
  });

const fila = (codigo: string, localidad: string) => ({
  'Código interno': codigo,
  Nombre: `Importado ${codigo}`,
  Localidad: localidad,
  Activo: 'Sí',
});

describe('importar departamentos desde Excel', () => {
  it('la localidad se escribe por su nombre o por su código', async () => {
    const porNombre = await importar(
      cuenta.propietario,
      await libroConUnaFila(cuenta.propietario, fila('imp-n', 'Localidad PRO-1')),
      false,
    );
    const porCodigo = await importar(
      cuenta.propietario,
      await libroConUnaFila(cuenta.propietario, fila('imp-c', 'pro-1')),
      false,
    );
    const guardados = await comoPropietario<{ codigo: string; localidad_id: string }>(
      "select codigo, localidad_id from empresas.departamentos where codigo in ('IMP-N', 'IMP-C') order by codigo",
      [],
    );

    expect([porNombre.estado, porCodigo.estado]).toEqual([200, 200]);
    expect(guardados.map((g) => g.localidad_id)).toEqual([localidadId, localidadId]);
  });

  it('sin localidad queda para toda la empresa y una localidad que no existe se informa', async () => {
    const libre = await importar(
      cuenta.propietario,
      await libroConUnaFila(cuenta.propietario, fila('imp-l', '')),
      false,
    );
    const rota = await importar(
      cuenta.propietario,
      await libroConUnaFila(cuenta.propietario, fila('imp-x', 'No existe')),
      true,
    );

    expect(libre.cuerpo).toMatchObject({ guardado: true });
    expect(JSON.stringify(rota.cuerpo)).toContain('No existe');
  });

  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);

    const revision = await importar(cuenta.propietario, exportado.cuerpo as Buffer, true);

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });
});
