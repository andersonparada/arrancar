import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/empresas/inmuebles';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

/** La plantilla con una fila: los valores se ponen por el título de su columna. */
async function libroConUnaFila(valores: Record<string, unknown>): Promise<Buffer> {
  const plantilla = (await cuenta.propietario.get(`${RUTA}/plantilla`)).cuerpo as Buffer;
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(plantilla as unknown as ExcelJS.Buffer);
  const hoja = libro.worksheets[0]!;
  hoja.getRow(1).eachCell((celda, columna) => {
    const valor = valores[String(celda.value).replace(/\s*\*$/, '')];
    if (valor !== undefined) hoja.getRow(2).getCell(columna).value = valor as ExcelJS.CellValue;
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

const importar = (contenido: Buffer, ensayo: boolean) =>
  cuenta.propietario.subirImagen('POST', `${RUTA}/importar?ensayo=${ensayo}`, {
    nombreArchivo: 'inmuebles.xlsx',
    tipoMime: TIPO_EXCEL,
    contenido,
  });

const fila = (nombre: string, finca: string, extra: Record<string, unknown> = {}) => ({
  Nombre: nombre,
  'Situación registral': 'Inscrito en el registro',
  Registro: 'Registro General de la Propiedad',
  'Número de finca': finca,
  Folio: '9',
  Libro: '8B',
  'Departamento del libro': '01',
  Titularidad: 'Propia',
  'Titulación supletoria en trámite': 'No',
  ...extra,
});

const valoresDe = (nombre: string) =>
  comoPropietario<{
    fuente: string;
    vigente_desde: string;
    origen: string;
    valor_total: string;
    categoria_iusi: string | null;
  }>(
    `select v.fuente, v.vigente_desde::text, v.origen, v.valor_total::text, v.categoria_iusi
       from empresas.valores_de_inmueble v join empresas.inmuebles i on i.id = v.inmueble_id
      where i.nombre = $1 order by v.fuente`,
    [nombre],
  );

beforeAll(async () => {
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Excel valores', usuario: 'propietarioexcelvalores' });
});

describe('Excel de inmuebles con valores', () => {
  it('importa el inmueble con su valor de matrícula (y categoría) y el de catastro; el ensayo no guarda', async () => {
    const libro = await libroConUnaFila(
      fila('Con valores', '800', {
        'Matrícula fiscal: vigente desde': '15/03/2026',
        'Matrícula fiscal: origen': 'Autoavalúo',
        'Matrícula fiscal: valor total': 1500000,
        'Matrícula fiscal: categoría del IUSI': 'Comercial',
        'Catastro municipal: vigente desde': '01/01/2025',
        'Catastro municipal: origen': 'Avalúo municipal',
        'Catastro municipal: valor total': 900000.5,
      }),
    );

    const ensayo = await importar(libro, true);
    const tras = await valoresDe('Con valores');
    const real = await importar(libro, false);

    expect(ensayo.cuerpo).toMatchObject({ guardado: false });
    expect(tras).toEqual([]);
    expect(real.estado).toBe(200);
    expect(await valoresDe('Con valores')).toEqual([
      {
        fuente: 'catastro_municipal',
        vigente_desde: '2025-01-01',
        origen: 'avaluo_municipal',
        valor_total: '900000.50',
        categoria_iusi: null,
      },
      {
        fuente: 'matricula_fiscal',
        vigente_desde: '2026-03-15',
        origen: 'autoavaluo',
        valor_total: '1500000.00',
        categoria_iusi: 'comercial',
      },
    ]);
  });

  it('una fila sin valores sigue creando solo el inmueble', async () => {
    const real = await importar(await libroConUnaFila(fila('Sin valores', '801')), false);

    expect(real.estado).toBe(200);
    expect(await valoresDe('Sin valores')).toEqual([]);
    const creado = await comoPropietario("select 1 from empresas.inmuebles where nombre = 'Sin valores'", []);
    expect(creado).toHaveLength(1);
  });

  it('un valor a medias se informa en la columna que falta y no guarda nada de la fila', async () => {
    const libro = await libroConUnaFila(
      fila('A medias', '802', {
        'Matrícula fiscal: valor total': 1000,
        'Matrícula fiscal: categoría del IUSI': 'Vivienda',
      }),
    );

    const revision = await importar(libro, false);
    const texto = JSON.stringify(revision.cuerpo);

    expect(revision.cuerpo.guardado).toBe(false);
    expect(texto).toContain('Falta este dato del valor de matrícula fiscal');
    expect(await comoPropietario("select 1 from empresas.inmuebles where nombre = 'A medias'", [])).toEqual([]);
  });

  it('un valor que rompe las reglas del dominio deshace todo, también el inmueble', async () => {
    const libro = await libroConUnaFila(
      fila('Valor malo', '803', {
        'Catastro municipal: vigente desde': '01/01/2025',
        'Catastro municipal: origen': 'Otro',
        'Catastro municipal: valor total': 1000,
        'Catastro municipal: valor del terreno': 5000,
      }),
    );

    const revision = await importar(libro, false);

    expect(revision.cuerpo.guardado).toBe(false);
    expect(await comoPropietario("select 1 from empresas.inmuebles where nombre = 'Valor malo'", [])).toEqual([]);
  });

  it('exporta el valor vigente de cada fuente, no uno futuro ni uno anterior', async () => {
    const creado = await cuenta.propietario.post(RUTA, {
      nombre: 'Para exportar',
      situacionRegistral: 'posesorio',
      documentoPosesorio: 'Escritura 7',
      titularidad: 'propia',
    });
    const valores = `${RUTA}/${creado.cuerpo.id}/valores`;
    const base = { fuente: 'matricula_fiscal', origen: 'autoavaluo' };
    await cuenta.propietario.post(valores, { ...base, vigenteDesde: '2020-01-01', valorTotal: '100.00' });
    await cuenta.propietario.post(valores, {
      ...base,
      vigenteDesde: '2025-01-01',
      valorTotal: '200.00',
      categoriaIusi: 'mixto',
    });
    await cuenta.propietario.post(valores, { ...base, vigenteDesde: '2999-01-01', valorTotal: '300.00' });

    const exportado = await cuenta.propietario.get(`${RUTA}/exportar`);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;
    const titulos = (hoja.getRow(1).values as unknown[]).map((titulo) => String(titulo ?? '').replace(/\s*\*$/, ''));
    let encontrada: ExcelJS.Row | undefined;
    hoja.eachRow((registro) => {
      if (registro.getCell(titulos.indexOf('Nombre')).value === 'Para exportar') encontrada = registro;
    });
    const celda = (titulo: string) => encontrada!.getCell(titulos.indexOf(titulo)).value;

    expect(Number(celda('Matrícula fiscal: valor total'))).toBe(200);
    expect(celda('Matrícula fiscal: categoría del IUSI')).toBe('Mixto');
    expect(celda('Catastro municipal: valor total') ?? null).toBeNull();
  });
});
