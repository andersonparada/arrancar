import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ClienteApi } from './soporte/cliente-api.js';
import { clonarDocumento } from './soporte/clonar-documentos.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  documentoDePrueba,
  HOY,
  instalarDestinoFalso,
  nitValido,
  prepararEscenario,
  primerDiaDelMes,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const RUTA = '/api/libro-de-compras/libro';
const PERIODO = HOY.slice(0, 7);
let escenario: EscenarioDeDocumentos;
let propietario: ClienteApi;
let soloVer: ClienteApi;
let exportador: ClienteApi;
let emisor: ClienteApi;

async function registrar(cambios: Record<string, unknown> = {}, donde: EscenarioDeDocumentos = escenario) {
  const respuesta = await donde.cuenta.propietario.post(RUTA_DOCUMENTOS, documentoDePrueba(donde, cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return respuesta.cuerpo.documento.id as string;
}

const usuario = (nombres: string, permisos: string[]) =>
  crearUsuarioConPermisos(entorno, escenario.cuenta, { nombres, apellidos: 'Pdf', permisos });

const ultimoFolioGuardado = async () =>
  Number(
    (await consultar<{ ultimo_folio: number }>('select ultimo_folio from libro_de_compras.foliacion_del_libro'))[0]
      ?.ultimo_folio ?? 0,
  );

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'librodepdf');
  propietario = escenario.cuenta.propietario;
  const hostil = `${'W'.repeat(100)}‮😀日本語`;
  const { proveedorId } = await registrarProveedor(escenario.cuenta, hostil);
  await registrar();
  await registrar({ proveedorId, nitEmisor: nitValido('3000001') });
  const anulada = await registrar();
  await propietario.post(`${RUTA_DOCUMENTOS}/${anulada}/anular`, { causa: 'error_de_captura', motivo: 'Error' });
  await registrar({ fechaEmision: primerDiaDelMes(-1), fechaRecepcion: primerDiaDelMes(-1) });
  soloVer = await usuario('Solo ver', ['libro-de-compras.libro.ver']);
  exportador = await usuario('Exportador', ['libro-de-compras.libro.exportar']);
  emisor = await usuario('Emisor', ['libro-de-compras.libro.ver', 'libro-de-compras.libro.emitir']);
});

afterAll(() => vi.restoreAllMocks());

describe('Excel del libro', () => {
  it('exige libro.exportar', async () => {
    expect((await soloVer.get(`${RUTA}/exportar?periodo=${PERIODO}`)).estado).toBe(403);
  });

  it('trae tres hojas: Libro, Resumen y Anulados', async () => {
    const respuesta = await exportador.get(`${RUTA}/exportar?periodo=${PERIODO}`);

    expect(respuesta.estado).toBe(200);
    expect(respuesta.cabeceras['content-type']).toContain('spreadsheetml');
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(respuesta.cuerpo as ArrayBuffer);
    expect(libro.worksheets.map((hoja) => hoja.name)).toEqual(['Libro', 'Resumen', 'Anulados']);
    expect(libro.getWorksheet('Libro')!.rowCount).toBe(1 + 2);
    expect(libro.getWorksheet('Anulados')!.rowCount).toBe(1 + 1);
    expect(String(libro.getWorksheet('Libro')!.getCell('G3').value)).toContain('W'.repeat(100));
  });
});

describe('PDF del libro con folios', () => {
  it('emitir exige libro.emitir', async () => {
    expect((await soloVer.post(`${RUTA}/emisiones`, { periodo: PERIODO })).estado).toBe(403);
  });

  it('la primera emisión gasta los folios de sus hojas y guarda el PDF', async () => {
    const respuesta = await emisor.post(`${RUTA}/emisiones`, { periodo: PERIODO });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({ folioDesde: 1, folioHasta: 2, paginas: 2, sustituida: false });
    expect(await ultimoFolioGuardado()).toBe(2);
    const guardados = await consultar<{ paginas: number }>(
      "select paginas from core.archivos where recurso_dueno = 'libro-de-compras.emisiones-del-libro'",
    );
    expect(guardados).toEqual([{ paginas: 2 }]);
  });

  it('la copia es el mismo PDF y no gasta folios', async () => {
    const emisiones = (await soloVer.get(`${RUTA}/emisiones?periodo=${PERIODO}`)).cuerpo;
    const url = `${RUTA}/emisiones/${emisiones.emisiones[0].id}/pdf`;

    const [uno, dos] = [await soloVer.get(url), await soloVer.get(url)];

    expect(uno.estado).toBe(200);
    expect(uno.cabeceras['content-type']).toBe('application/pdf');
    expect((uno.cuerpo as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    expect(Buffer.compare(uno.cuerpo as Buffer, dos.cuerpo as Buffer)).toBe(0);
    expect(await ultimoFolioGuardado()).toBe(2);
  });

  it('emitir de nuevo sin cambios responde 409 y ofrece la copia', async () => {
    const respuesta = await emisor.post(`${RUTA}/emisiones`, { periodo: PERIODO });

    expect(respuesta.estado).toBe(409);
    expect(respuesta.cuerpo.error.codigo).toBe('emision_sin_cambios');
    expect(respuesta.cuerpo.error.detalles.emisionId).toBeTruthy();
    expect(await ultimoFolioGuardado()).toBe(2);
  });

  it('el borrador no guarda nada ni gasta folios', async () => {
    const respuesta = await soloVer.get(`${RUTA}/pdf?periodo=${PERIODO}`);

    expect(respuesta.estado).toBe(200);
    expect((respuesta.cuerpo as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    expect(await ultimoFolioGuardado()).toBe(2);
    expect((await soloVer.get(`${RUTA}/emisiones`)).cuerpo.emisiones).toHaveLength(1);
  });

  it('con datos nuevos exige el motivo y sigue la numeración', async () => {
    await registrar();

    const sinMotivo = await emisor.post(`${RUTA}/emisiones`, { periodo: PERIODO });
    const conMotivo = await emisor.post(`${RUTA}/emisiones`, { periodo: PERIODO, motivo: 'Faltaba una factura' });

    expect(sinMotivo.estado).toBe(400);
    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_de_emision_obligatorio');
    expect(conMotivo.estado).toBe(201);
    expect(conMotivo.cuerpo).toMatchObject({ folioDesde: 3, folioHasta: 4, motivo: 'Faltaba una factura' });
    const lista = (await soloVer.get(`${RUTA}/emisiones`)).cuerpo;
    expect(lista.ultimoFolio).toBe(4);
    expect(lista.emisiones.map((e: { sustituida: boolean }) => e.sustituida)).toEqual([false, true]);
  });
});

describe('corregir el último folio', () => {
  it('no baja de lo ya emitido (422) y exige libro.emitir', async () => {
    const cuerpo = { ultimoFolio: 3, motivo: 'Prueba' };

    expect((await soloVer.put(`${RUTA}/foliacion`, cuerpo)).estado).toBe(403);
    const respuesta = await emisor.put(`${RUTA}/foliacion`, cuerpo);
    expect(respuesta.estado).toBe(422);
    expect(respuesta.cuerpo.error.codigo).toBe('folio_menor_que_lo_emitido');
  });

  it('sube el último folio, deja la auditoría y la siguiente emisión sigue desde ahí', async () => {
    const respuesta = await emisor.put(`${RUTA}/foliacion`, { ultimoFolio: 50, motivo: 'Venía de hojas usadas' });

    expect(respuesta.cuerpo).toEqual({ ultimoFolio: 50 });
    const auditoria = await consultar<{ anterior: { ultimoFolio: number }; motivo: string }>(
      "select anterior, motivo from core.auditoria where recurso = 'libro-de-compras.foliacion-del-libro'",
    );
    expect(auditoria).toEqual([{ anterior: { ultimoFolio: 4 }, motivo: 'Venía de hojas usadas' }]);
    await registrar();
    const siguiente = await propietario.post(`${RUTA}/emisiones`, { periodo: PERIODO, motivo: 'Otra factura' });
    expect(siguiente.cuerpo).toMatchObject({ folioDesde: 51, folioHasta: 52 });
  });

  it('dos emisiones a la vez de períodos distintos usan folios seguidos, sin repetir', async () => {
    const otro = await usuario('Otro emisor', ['libro-de-compras.libro.emitir']);
    await registrar({ fechaEmision: primerDiaDelMes(-2), fechaRecepcion: primerDiaDelMes(-2) });

    const [uno, dos] = await Promise.all([
      emisor.post(`${RUTA}/emisiones`, { periodo: primerDiaDelMes(-1).slice(0, 7) }),
      otro.post(`${RUTA}/emisiones`, { periodo: primerDiaDelMes(-2).slice(0, 7) }),
    ]);

    expect([uno.estado, dos.estado]).toEqual([201, 201]);
    const [primera, segunda] = [uno.cuerpo, dos.cuerpo].sort((a, b) => a.folioDesde - b.folioDesde);
    expect(primera.folioDesde).toBe(53);
    expect(segunda.folioDesde).toBe(primera.folioHasta + 1);
    expect(await ultimoFolioGuardado()).toBe(segunda.folioHasta);
  });
});

describe('límites', () => {
  it('un libro de más de 5,000 filas no se emite ni se imprime, pero sí se exporta', async () => {
    const grande = await prepararEscenario(entorno, 'librogrande');
    const plantilla = await registrar({}, grande);
    await clonarDocumento(plantilla, 5000);
    const quien = await crearUsuarioConPermisos(entorno, grande.cuenta, {
      nombres: 'Grande',
      apellidos: 'Pdf',
      permisos: ['libro-de-compras.libro.emitir', 'libro-de-compras.libro.ver', 'libro-de-compras.libro.exportar'],
    });

    const emitir = await quien.post(`${RUTA}/emisiones`, { periodo: PERIODO });
    const borrador = await quien.get(`${RUTA}/pdf?periodo=${PERIODO}`);
    const excel = await quien.get(`${RUTA}/exportar?periodo=${PERIODO}`);

    expect(emitir.estado).toBe(422);
    expect(emitir.cuerpo.error.codigo).toBe('libro_con_demasiadas_filas');
    expect(borrador.estado).toBe(422);
    expect(excel.estado).toBe(200);
    expect((await quien.get(`${RUTA}/emisiones`)).cuerpo).toMatchObject({ ultimoFolio: 0, emisiones: [] });
  }, 120_000);
});
