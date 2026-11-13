import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { xlsDePrueba } from '../modulos/core/intercambio/infraestructura/lectura/xls/xls-de-prueba.js';
import { excelDePrueba, parteDeCeros } from '../modulos/core/intercambio/infraestructura/zip/zip-de-prueba.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  configurarEmpresa,
  consultar,
  documentoDePrueba,
  instalarDestinoFalso,
  NIT_DE_LA_EMPRESA,
  NIT_DEL_PROVEEDOR,
  prepararEscenario,
  registrarProveedor,
  RUTA_DOCUMENTOS,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { RUTA_DTE } from './soporte/escenario-de-bandeja.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const RUTA_IMPORTAR = `${RUTA_DTE}/importar`;
const TIPO_XLS = 'application/vnd.ms-excel';
let escenario: EscenarioDeDocumentos;
let proveedorId: string;

const propietario = (): ClienteApi => escenario.cuenta.propietario;

const ENCABEZADOS = [
  'Fecha de emisión',
  'Número de Autorización',
  'Tipo de DTE (nombre)',
  'Serie',
  'Número del DTE',
  'NIT del emisor',
  'Nombre completo del emisor',
  'ID del receptor',
  'Estado',
  'Moneda',
  'Gran Total (Moneda Original)',
  'IVA (monto de este impuesto)',
  'Marca de anulado',
  'Fecha de anulación',
  'Petróleo (monto de este impuesto)',
];

let consecutivo = 0;
const uuid = () => `${String(++consecutivo).padStart(8, '0')}-1111-4222-8333-444444444444`;

/** Una fila de la consulta de la SAT; `cambios` ajusta cualquier columna por su encabezado. */
function fila(cambios: Record<string, string> = {}): string[] {
  const valores: Record<string, string> = {
    'Fecha de emisión': '2026-10-05T10:15:30.123-06:00',
    'Número de Autorización': uuid(),
    'Tipo de DTE (nombre)': 'FACT',
    Serie: 'SAT1',
    'Número del DTE': String(consecutivo),
    'NIT del emisor': NIT_DEL_PROVEEDOR,
    'Nombre completo del emisor': 'Agro del Norte, S.A.',
    'ID del receptor': NIT_DE_LA_EMPRESA,
    Estado: 'Vigente',
    Moneda: 'GTQ',
    'Gran Total (Moneda Original)': '1120.000000',
    'IVA (monto de este impuesto)': '120.00000000',
    'Marca de anulado': 'No',
    'Fecha de anulación': '',
    'Petróleo (monto de este impuesto)': '0',
    ...cambios,
  };
  return ENCABEZADOS.map((titulo) => valores[titulo] ?? '');
}

const xls = (filas: string[][]) => xlsDePrueba([['Consulta de DTE recibidos'], ENCABEZADOS, ...filas]);

const subir = (cliente: ClienteApi, contenido: Buffer, nombreArchivo = 'consulta.xls') =>
  cliente.subirImagen('POST', RUTA_IMPORTAR, { nombreArchivo, tipoMime: TIPO_XLS, contenido });

const listar = async (consulta = '') => (await propietario().get(`${RUTA_DTE}${consulta}`)).cuerpo.elementos as any[];

beforeAll(async () => {
  instalarDestinoFalso();
  escenario = await prepararEscenario(entorno, 'importardte');
  await configurarEmpresa(escenario.cuenta, {
    regimenIva: 'general',
    regimenIsr: 'utilidades',
    agenteDeRetencionIva: 'ninguno',
    esAgenteDeRetencionIsr: false,
  });
  proveedorId = (await registrarProveedor(escenario.cuenta, 'Agro del Norte, S.A.', { nit: NIT_DEL_PROVEEDOR }))
    .proveedorId;
});

afterAll(() => vi.restoreAllMocks());

describe('importar el archivo de la SAT', () => {
  it('carga un .xls: crea las filas pendientes con su proveedor, rechaza lo que no entra y guarda el lote', async () => {
    const buena = fila();
    const anulada = fila({ Estado: 'Anulado', 'Marca de anulado': 'Si' });
    const ajena = fila({ Moneda: 'USD' });

    const respuesta = await subir(propietario(), xls([buena, anulada, ajena]));

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    const { lote } = respuesta.cuerpo;
    expect(lote).toMatchObject({
      formato: 'xls',
      nombreDelArchivo: 'consulta.xls',
      filasLeidas: 3,
      filasNuevas: 2,
      filasActualizadas: 0,
      filasSinCambio: 0,
      filasRechazadas: 1,
      anuladasEnLaSat: 1,
      emisionDesde: '2026-10-05',
      emisionHasta: '2026-10-05',
    });
    expect(lote.rechazos).toEqual([expect.objectContaining({ fila: 5, motivo: 'moneda_no_admitida' })]);
    const filas = await listar(`?loteId=${lote.id}`);
    expect(filas).toHaveLength(2);
    expect(filas.every((f) => f.estado === 'pendiente' && f.nitReceptor === NIT_DE_LA_EMPRESA)).toBe(true);
    expect(filas[0].borrador.proveedorId).toBe(proveedorId);
    expect(filas.find((f) => f.estadoSat === 'anulado').anuladoEnLaSatEl).not.toBeNull();
  });

  it('volver a subir el mismo archivo no cambia nada y avisa que ya se subió', async () => {
    const contenido = xls([fila(), fila()]);
    await subir(propietario(), contenido);

    const otra = await subir(propietario(), contenido);

    expect(otra.cuerpo.lote).toMatchObject({ filasNuevas: 0, filasActualizadas: 0, filasSinCambio: 2 });
    expect(otra.cuerpo.avisos).toContain('Este mismo archivo ya se había subido antes.');
  });

  it('cuenta los DTE de antes de la fecha de inicio y lo avisa', async () => {
    const ruta = `/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`;
    await propietario().put(ruta, { fechaDeInicio: '2026-10-01' });
    const anterior = fila({ 'Fecha de emisión': '2026-09-20T10:00:00.000-06:00' });

    const respuesta = await subir(propietario(), xls([anterior, fila()]));

    expect(respuesta.cuerpo.anterioresALaFechaDeInicio).toBe(1);
    expect(respuesta.cuerpo.avisos.some((a: string) => a.includes('son de antes de la fecha de inicio'))).toBe(true);
  });

  it('una fila que pasa a anulada se actualiza, se audita como corregir y no toca lo completado', async () => {
    const vigente = fila();
    const autorizacion = vigente[1] as string;
    const primera = await subir(propietario(), xls([vigente]));
    const [guardada] = await listar(`?loteId=${primera.cuerpo.lote.id}`);
    const completada = await propietario().patch(RUTA_DTE, {
      ids: [guardada.id],
      cambios: { conceptoId: escenario.conceptoId },
    });
    expect(completada.estado).toBe(200);

    const anulada = fila({
      'Número de Autorización': autorizacion,
      Estado: 'Anulado',
      'Fecha de anulación': '2026-10-20T08:00:00-06:00',
    });
    const segunda = await subir(
      propietario(),
      xls([anulada.map((celda, i) => (i === 4 ? (vigente[4] as string) : celda))]),
    );

    expect(segunda.cuerpo.lote).toMatchObject({ filasActualizadas: 1, anuladasEnLaSat: 1 });
    const [despues] = await listar(`?loteId=${segunda.cuerpo.lote.id}`);
    expect(despues).toMatchObject({
      id: guardada.id,
      estadoSat: 'anulado',
      anuladoEnLaSatEl: '2026-10-20',
      estado: 'pendiente',
      borrador: { conceptoId: escenario.conceptoId },
    });
    const auditoria = await consultar<{ accion: string; motivo: string }>(
      "select accion, motivo from core.auditoria where recurso = 'libro-de-compras.dte-recibidos' and registro_id = $1",
      [guardada.id],
    );
    expect(auditoria).toEqual([expect.objectContaining({ accion: 'corregir' })]);
    expect(auditoria[0]?.motivo).toContain('estadoSat');
  });

  it('una autorización que ya se registró a mano entra como registrada, con su documento', async () => {
    const autorizacionFel = '99999999-1111-4222-8333-444444444444';
    const documento = await propietario().post(
      RUTA_DOCUMENTOS,
      documentoDePrueba(escenario, { proveedorId, autorizacionFel, nitEmisor: NIT_DEL_PROVEEDOR }),
    );
    expect(documento.estado, JSON.stringify(documento.cuerpo)).toBe(201);

    const respuesta = await subir(propietario(), xls([fila({ 'Número de Autorización': autorizacionFel })]));

    const [registrada] = await listar(`?loteId=${respuesta.cuerpo.lote.id}`);
    expect(registrada).toMatchObject({ estado: 'registrado', documentoId: documento.cuerpo.documento.id });
  });

  it('lee también .xlsx y CSV con punto y coma', async () => {
    const csv = [ENCABEZADOS.join(';'), fila().join(';')].join('\n');

    const respuesta = await propietario().subirImagen('POST', RUTA_IMPORTAR, {
      nombreArchivo: 'consulta.csv',
      tipoMime: 'text/csv',
      contenido: Buffer.from(csv, 'utf8'),
    });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
    expect(respuesta.cuerpo.lote).toMatchObject({ formato: 'csv', filasNuevas: 1 });
  });
});

describe('importar: archivos que no se aceptan y permisos', () => {
  it('un archivo sin las columnas de la SAT da 400 con lo que falta', async () => {
    const sinSerie = xlsDePrueba([ENCABEZADOS.filter((t) => t !== 'Serie'), []]);

    const respuesta = await subir(propietario(), sinSerie);

    expect(respuesta.estado).toBe(400);
    expect(respuesta.cuerpo.error.codigo).toBe('archivo_de_la_sat_no_reconocido');
    expect(respuesta.cuerpo.error.detalles.faltan).toEqual(['Serie']);
  });

  it('un .xls con objetos incrustados, HTML disfrazado y una bomba zip se rechazan', async () => {
    const importador = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
      nombres: 'Importador',
      apellidos: 'Hostil',
      permisos: ['libro-de-compras.documentos.importar'],
    });
    const conObjeto = xlsDePrueba([ENCABEZADOS], { hoja: [Buffer.from([0x5d, 0x00, 0x00, 0x00])] });
    const html = Buffer.from('<html><table></table></html>');
    const bomba = excelDePrueba([parteDeCeros('xl/worksheets/sheet1.xml', 30)]);

    const codigos = [];
    for (const contenido of [conObjeto, html, bomba])
      codigos.push((await subir(importador, contenido)).cuerpo.error.codigo);

    expect(codigos).toEqual([
      'excel_con_contenido_no_permitido',
      'archivo_de_texto_no_admitido',
      'excel_demasiado_grande_al_descomprimir',
    ]);
  });

  it('exige libro-de-compras.documentos.importar y no deja a otra empresa ver las filas', async () => {
    const solo = await crearUsuarioConPermisos(entorno, escenario.cuenta, {
      nombres: 'Solo',
      apellidos: 'Ver',
      permisos: ['libro-de-compras.documentos.ver'],
    });

    const respuesta = await subir(solo, xls([fila()]));

    expect(respuesta.estado).toBe(403);
  });

  it('sin sesión da 401', async () => {
    const anonimo = entorno.nuevoCliente();

    expect((await subir(anonimo, xls([fila()]))).estado).toBe(401);
  });
});
