/**
 * Clases de activos (AF-1): los conceptos de gasto que las proponen (aislamiento entre empresas de una cuenta y auditoría
 * al quitarlos) y el Excel (plantilla, exportar, importar con ensayo, tope de ley y todo o nada, permisos).
 */
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearUsuarioConPermisos, darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const RUTA = '/api/activos-fijos/clases';
const CONCEPTOS = '/api/libro-de-compras/conceptos-de-gasto';
const TIPO_EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;
let importador: ClienteApi;
let exportador: ClienteApi;
let conceptoDeVehiculos: string;
let conceptoDeMuebles: string;

const datos = (nombre: string) => ({
  nombre,
  incisoFiscal: 'maquinaria_y_vehiculos',
  porcentajeFiscal: '20.00',
  vidaUtilContableMeses: null,
  valorResidualPorcentaje: '0.00',
  activo: true,
});

type Fila = Record<string, unknown>;

/** La plantilla con las filas dadas: los valores se ponen por el título de su columna. */
async function libroCon(usuario: ClienteApi, filas: Fila[]): Promise<Buffer> {
  const plantilla = (await usuario.get(`${RUTA}/plantilla`)).cuerpo as Buffer;
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
    await usuario.subirImagen('POST', `${RUTA}/importar?ensayo=${ensayo}`, {
      nombreArchivo: 'clases.xlsx',
      tipoMime: TIPO_EXCEL,
      contenido: await libroCon(usuario, filas),
    })
  ).cuerpo;

const fila = (nombre: string, cambios: Fila = {}): Fila => ({
  Nombre: nombre,
  'Inciso fiscal': 'Maquinaria, vehículos y semovientes de trabajo (inciso 4)',
  'Porcentaje fiscal anual': '20.00',
  'Valor residual (%)': '0.00',
  Activo: 'Sí',
  ...cambios,
});

const clasesConNombre = (nombre: string) =>
  comoPropietario<{ id: string }>('select id from activos_fijos.clases where nombre = $1', [nombre]);

beforeAll(async () => {
  const modulos = ['terceros', 'libro-de-compras', 'activos-fijos'];
  cuenta = await darDeAltaCuenta(entorno, { nombre: 'Conceptos', usuario: 'propietarioconceptos', modulos });
  const permisos = (accion: string) => [`activos-fijos.clases.${accion}`];
  importador = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Importador',
    apellidos: 'Clases',
    permisos: permisos('importar'),
  });
  exportador = await crearUsuarioConPermisos(entorno, cuenta, {
    nombres: 'Exportador',
    apellidos: 'Clases',
    permisos: permisos('exportar'),
  });
  const creados = await Promise.all(
    ['Vehículos y transporte', 'Muebles y enseres'].map((nombre) =>
      cuenta.propietario.post(CONCEPTOS, {
        nombre,
        tipoPorOmision: 'bien',
        esProductoAgropecuario: false,
        esActivoFijo: true,
        activo: true,
      }),
    ),
  );
  [conceptoDeVehiculos, conceptoDeMuebles] = creados.map((creado) => creado.cuerpo.id) as [string, string];
});

describe('conceptos de gasto que proponen la clase', () => {
  it('se fijan, se leen por nombre y la lista nueva reemplaza a la anterior, con auditoría de lo que se quita', async () => {
    const clase = (await cuenta.propietario.post(RUTA, datos('Vehículos propios'))).cuerpo.id;

    const fijados = await cuenta.propietario.put(`${RUTA}/${clase}/conceptos`, {
      conceptoIds: [conceptoDeVehiculos, conceptoDeMuebles],
    });
    const reemplazados = await cuenta.propietario.put(`${RUTA}/${clase}/conceptos`, {
      conceptoIds: [conceptoDeVehiculos],
    });

    expect(fijados.cuerpo.map((c: { nombre: string }) => c.nombre)).toEqual([
      'Muebles y enseres',
      'Vehículos y transporte',
    ]);
    expect(reemplazados.cuerpo).toEqual([
      { conceptoDeGastoId: conceptoDeVehiculos, nombre: 'Vehículos y transporte', claseId: clase },
    ]);
    expect((await cuenta.propietario.get(`${RUTA}/${clase}/conceptos`)).cuerpo).toEqual(reemplazados.cuerpo);
    const quitados = await comoPropietario(
      "select 1 from core.auditoria where recurso = 'activos-fijos.clases-por-concepto' and accion = 'quitar' and registro_id = $1",
      [conceptoDeMuebles],
    );
    expect(quitados).toHaveLength(1);
  });

  it('un concepto que ya proponía otra clase pasa a la nueva y no se puede eliminar la clase con conceptos', async () => {
    const una = (await cuenta.propietario.post(RUTA, datos('Una clase'))).cuerpo.id;
    const otra = (await cuenta.propietario.post(RUTA, datos('Otra clase'))).cuerpo.id;
    await cuenta.propietario.put(`${RUTA}/${una}/conceptos`, { conceptoIds: [conceptoDeMuebles] });

    await cuenta.propietario.put(`${RUTA}/${otra}/conceptos`, { conceptoIds: [conceptoDeMuebles] });
    const enUso = await cuenta.propietario.delete(`${RUTA}/${otra}`);

    expect((await cuenta.propietario.get(`${RUTA}/${una}/conceptos`)).cuerpo).toEqual([]);
    expect(enUso.estado).toBe(422);
    expect(enUso.cuerpo.error.codigo).toBe('clase_en_uso');
    expect((await cuenta.propietario.delete(`${RUTA}/${una}`)).estado).toBe(204);
  });

  it('un concepto inexistente o de otra empresa se rechaza y deja todo como estaba', async () => {
    const clase = (await cuenta.propietario.post(RUTA, datos('Con ajenos'))).cuerpo.id;
    await cuenta.propietario.put(`${RUTA}/${clase}/conceptos`, { conceptoIds: [conceptoDeVehiculos] });

    const inexistente = await cuenta.propietario.put(`${RUTA}/${clase}/conceptos`, {
      conceptoIds: ['4b2f2f0e-2f0b-4c58-9a1e-0a3c8d6d1b11'],
    });

    expect(inexistente.estado).toBe(404);
    expect((await cuenta.propietario.get(`${RUTA}/${clase}/conceptos`)).cuerpo).toHaveLength(1);
  });

  it('quien solo ve no cambia los conceptos', async () => {
    const lector = await crearUsuarioConPermisos(entorno, cuenta, {
      nombres: 'Lector',
      apellidos: 'Conceptos',
      permisos: ['activos-fijos.clases.ver'],
    });
    const clase = (await cuenta.propietario.post(RUTA, datos('Para lector'))).cuerpo.id;

    expect((await lector.get(`${RUTA}/${clase}/conceptos`)).estado).toBe(200);
    expect((await lector.put(`${RUTA}/${clase}/conceptos`, { conceptoIds: [] })).estado).toBe(403);
  });
});

describe('Excel de clases', () => {
  it('lo exportado se puede revisar para importarlo de nuevo', async () => {
    const exportado = await exportador.get(`${RUTA}/exportar`);

    const revision = await importador.subirImagen('POST', `${RUTA}/importar?ensayo=true`, {
      nombreArchivo: 'clases.xlsx',
      tipoMime: TIPO_EXCEL,
      contenido: exportado.cuerpo,
    });

    expect(exportado.estado).toBe(200);
    expect(revision.cuerpo).toMatchObject({ guardado: false, filas: expect.any(Number) });
  });

  it('el ensayo no guarda nada y la importación crea las clases', async () => {
    const ensayo = await importarFilas([fila('Importada uno'), fila('Importada dos')], true);
    const antes = await clasesConNombre('Importada uno');
    const real = await importarFilas([fila('Importada uno'), fila('Importada dos')], false);

    expect(ensayo).toMatchObject({ guardado: false, filas: 2 });
    expect(antes).toEqual([]);
    expect(real).toMatchObject({ guardado: true, filas: 2 });
    expect(await clasesConNombre('Importada dos')).toHaveLength(1);
  });

  it('una fila con porcentaje sobre el tope o un nombre repetido detiene toda la importación', async () => {
    const resultado = await importarFilas(
      [
        fila('Buena fila'),
        fila('Sobre el tope', {
          'Porcentaje fiscal anual': '20.01',
          'Inciso fiscal': 'Edificios y construcciones (inciso 1)',
        }),
      ],
      false,
    );
    const repetida = await importarFilas([fila('Vehículos propios')], false);

    expect(resultado.guardado).toBe(false);
    expect(JSON.stringify(resultado)).toContain('porcentaje fiscal no puede pasar de 5');
    expect(await clasesConNombre('Buena fila')).toEqual([]);
    expect(repetida.guardado).toBe(false);
  });

  it('importar, exportar y bajar la plantilla exigen su permiso', async () => {
    expect((await exportador.get(`${RUTA}/plantilla`)).estado).toBe(403);
    expect((await importador.get(`${RUTA}/exportar`)).estado).toBe(403);
    expect((await importador.get(`${RUTA}/plantilla`)).estado).toBe(200);
  });
});
