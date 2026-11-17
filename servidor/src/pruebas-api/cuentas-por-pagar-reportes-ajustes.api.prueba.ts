/**
 * R8 (ajustes del mes para el contador) con fechas fijas en mayo de 2026: los ajustes del mes con su efecto y el aviso de
 * año anterior, las anulaciones del mes de ajustes de otros meses, las aplicaciones manuales, los pagos a la cuenta de
 * apertura y los documentos anulados o desautorizados, con la marca de los de un mes anterior; sus permisos y su Excel.
 */
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import { sembrarAjuste, sembrarAplicacionManual } from './soporte/cuentas-por-pagar-notas.js';
import { sembrarPago } from './soporte/cuentas-por-pagar-pagos.js';
import {
  anularDocumentoEnLaBase,
  fecharAjuste,
  fecharPago,
  sembrarContrasenaEnLaBase,
  sembrarDocumento,
} from './soporte/cuentas-por-pagar-reportes.js';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  consultar,
  nitValido,
  prepararEscenario,
  registrarProveedor,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const RUTA = '/api/cuentas-por-pagar/reportes';
const MES = '2026-05';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let proveedorId: string;

const ver = async (consulta = '') => {
  const respuesta = await escenario.cuenta.propietario.get(`${RUTA}/ajustes-del-mes?mes=${MES}${consulta}`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

const cargo = (numero: string, emision: string, extra: Record<string, unknown> = {}) =>
  sembrarDocumento(escenario, { proveedorId, numero, emision, vencimiento: '2026-12-01', monto: '500', ...extra });

/** Un documento del libro (los únicos que se pueden anular) con su emisión y el número como se lee. */
async function delLibro(emision: string): Promise<{ id: string; documento: string }> {
  const libroId = await new DocumentosPorPagarDePrueba(escenario, emision).registrar();
  const [fila] = await consultar<{ id: string; serie: string | null; numero: string }>(
    `update cuentas_por_pagar.documentos set fecha_emision = $2::date, creado_en = $2::date where documento_id = $1
     returning id, serie, numero`,
    [libroId, emision],
  );
  return { id: fila!.id, documento: fila!.serie ? `${fila!.serie}-${fila!.numero}` : fila!.numero };
}

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxrepajustes', MODULOS_DE_CUENTAS_POR_PAGAR);
  proveedorId = (await registrarProveedor(escenario.cuenta, 'Control S.A.', { nit: nitValido('6300001') })).proveedorId;
  const deAnterior = await sembrarDocumento(escenario, {
    proveedorId,
    numero: 'N-VIEJA',
    emision: '2025-12-01',
    vencimiento: null,
    monto: '300',
    tipo: 'nota_de_credito',
  });
  const reciente = await sembrarDocumento(escenario, {
    proveedorId,
    numero: 'N-NUEVA',
    emision: '2026-05-01',
    vencimiento: null,
    monto: '300',
    tipo: 'nota_de_credito',
  });
  await fecharAjuste(await sembrarAjuste(escenario, deAnterior, { monto: '40.00' }), '2026-05-10');
  await consultar(
    `update cuentas_por_pagar.ajustes_de_saldo set causa = 'compensado_con_otra_cuenta', referencia = 'Convenio' where id = $1`,
    [await sembrarAjuste(escenario, reciente, { monto: '25.00' })],
  );
  const abril = await sembrarAjuste(escenario, reciente, { monto: '10.00', estado: 'anulado' });
  await fecharAjuste(abril, '2026-04-10');
  await consultar(`update cuentas_por_pagar.ajustes_de_saldo set anulado_en = '2026-05-20T18:00:00Z' where id = $1`, [
    abril,
  ]);
  await fecharAjuste(await sembrarAjuste(escenario, reciente, { monto: '5.00' }), '2026-06-02');
  await consultar(`update cuentas_por_pagar.ajustes_de_saldo set fecha = '2026-05-12' where monto = 25.00`);
});

describe('R8 secciones 1 y 2: ajustes y anulaciones de otros meses', () => {
  it('lista los ajustes del mes con su efecto, año anterior y totales por causa; lo de otro mes no entra', async () => {
    const reporte = await ver();

    expect(reporte.ajustes).toMatchObject([
      {
        fecha: '2026-05-10',
        documento: 'S-N-VIEJA',
        causa: 'no_recuperable',
        efecto: 'perdida',
        monto: '40.00',
        anioAnterior: true,
      },
      {
        fecha: '2026-05-12',
        documento: 'S-N-NUEVA',
        causa: 'compensado_con_otra_cuenta',
        efecto: 'transitoria',
        anioAnterior: false,
      },
    ]);
    expect(reporte.totales.porCausa).toMatchObject([
      { causa: 'no_recuperable', efecto: 'perdida', cantidad: 1, monto: '40.00' },
      { causa: 'compensado_con_otra_cuenta', efecto: 'transitoria', cantidad: 1, monto: '25.00' },
    ]);
  });

  it('muestra la anulación del mes de un ajuste de abril, con quién, cuándo y por qué', async () => {
    const reporte = await ver();

    expect(reporte.anulacionesDeOtrosMeses).toMatchObject([
      { fecha: '2026-04-10', estado: 'anulado', monto: '10.00', motivoDeAnulacion: 'Error' },
    ]);
    expect(reporte.anulacionesDeOtrosMeses[0].anuladoPor).toBeTruthy();
    expect(reporte.totales.porSeccion.anulacionesDeOtrosMeses).toEqual({ cantidad: 1, monto: '10.00' });
  });

  it('filtra por causa y rechaza un mes mal escrito', async () => {
    expect((await ver('&causa=no_recuperable')).ajustes).toHaveLength(1);
    const malo = await escenario.cuenta.propietario.get(`${RUTA}/ajustes-del-mes?mes=2026-13`);
    expect(malo.estado).toBe(400);
  });
});

describe('R8 secciones 3 y 4: aplicaciones manuales y pagos a la cuenta de apertura', () => {
  it('lista la compensación manual y el pago a la apertura del mes', async () => {
    const nota = await sembrarDocumento(escenario, {
      proveedorId,
      numero: 'N-MANUAL',
      emision: '2026-05-02',
      vencimiento: null,
      monto: '200',
      tipo: 'nota_de_credito',
    });
    const factura = await cargo('F-MANUAL', '2026-05-02', { autorizado: true });
    const aplicacion = await sembrarAplicacionManual({ notaPropia: nota, cargoPropio: factura, monto: '100.00' });
    await consultar(`update cuentas_por_pagar.aplicaciones_de_notas set fecha = '2026-05-05' where id = $1`, [
      aplicacion,
    ]);
    const contrasena = await sembrarContrasenaEnLaBase(escenario, proveedorId, [factura]);
    const pago = await sembrarPago(escenario, {
      contrasenaId: contrasena,
      lineas: [{ cargoPropio: factura, monto: '150.00' }],
    });
    await fecharPago(pago.id, '2026-05-07', '2026-05-07');

    const reporte = await ver();

    expect(reporte.aplicacionesManuales).toMatchObject([
      { fecha: '2026-05-05', nota: 'S-N-MANUAL', cargo: 'S-F-MANUAL', monto: '100.00', referencia: 'Acuerdo 1' },
    ]);
    expect(reporte.pagosAApertura).toMatchObject([
      {
        fecha: '2026-05-07',
        monto: '150.00',
        motivo: 'Pago sembrado por la prueba',
        conCargaCerrada: false,
        estado: 'vigente',
      },
    ]);
  });
});

describe('R8 sección 5: documentos anulados o desautorizados en el mes', () => {
  it('marca el de un mes anterior y no el del mismo mes; también lo desautorizado, leído de la auditoría', async () => {
    const viejo = await delLibro('2026-03-01');
    const nuevo = await delLibro('2026-05-03');
    for (const [{ id }, dia] of [
      [viejo, '2026-05-15T18:00:00Z'],
      [nuevo, '2026-05-16T18:00:00Z'],
    ] as const) {
      await anularDocumentoEnLaBase(id);
      await consultar('update cuentas_por_pagar.documentos set anulado_en = $2 where id = $1', [id, dia]);
    }
    const devuelto = await cargo('F-DEVUELTA', '2026-02-10', { autorizado: true });
    await consultar(
      `insert into core.auditoria (cuenta_id, empresa_id, usuario_id, recurso, registro_id, accion, motivo, anterior, creado_en)
       values ($1, $2, (select id from core.usuarios where usuario = $3), 'cuentas-por-pagar.documentos', $4, 'devolver',
               'Faltaba el sello', $5::jsonb, '2026-05-20T18:00:00Z')`,
      [
        escenario.cuenta.cuentaId,
        escenario.cuenta.empresaId,
        escenario.cuenta.usuario,
        devuelto,
        JSON.stringify({ serie: 'S', numero: 'F-DEVUELTA', proveedorId, fechaEmision: '2026-02-10', total: '500.00' }),
      ],
    );

    const reporte = await ver();

    expect(reporte.documentosAnulados).toMatchObject([
      { documento: viejo.documento, deUnMesAnterior: true, motivo: 'Error de la prueba' },
      { documento: nuevo.documento, deUnMesAnterior: false, marca: null },
    ]);
    expect(reporte.documentosAnulados[0].marca).toContain('revise la rectificación del IVA');
    expect(reporte.documentosDesautorizados).toMatchObject([
      { documento: 'S-F-DEVUELTA', total: '500.00', motivo: 'Faltaba el sello', deUnMesAnterior: true },
    ]);
    expect(reporte.documentosDesautorizados[0].quien).toBeTruthy();
  });

  it('otro mes u otro proveedor no trae nada', async () => {
    const otro = (await registrarProveedor(escenario.cuenta, 'Otro S.A.', { nit: nitValido('6300002') })).proveedorId;

    const delOtro = await ver(`&proveedorId=${otro}`);
    const deJunio = await escenario.cuenta.propietario.get(`${RUTA}/ajustes-del-mes?mes=2026-06`);

    expect(delOtro.documentosAnulados).toEqual([]);
    expect(delOtro.ajustes).toEqual([]);
    expect(deJunio.cuerpo.documentosAnulados).toEqual([]);
    expect(deJunio.cuerpo.ajustes).toMatchObject([{ monto: '5.00' }]);
  });
});

describe('permisos y Excel de R8', () => {
  it('pide el permiso de ver o de exportar de control', async () => {
    const permiso = (nombre: string, accion: string) =>
      crearUsuarioConPermisos(entorno, escenario.cuenta, {
        nombres: nombre,
        apellidos: 'Control',
        permisos: [`cuentas-por-pagar.reportes-de-control.${accion}`],
      });
    const [soloVer, soloExportar] = [await permiso('Solo ve', 'ver'), await permiso('Solo exporta', 'exportar')];
    const ruta = `${RUTA}/ajustes-del-mes`;

    expect((await entorno.nuevoCliente().get(ruta)).estado).toBe(401);
    expect((await soloExportar.get(ruta)).estado).toBe(403);
    expect((await soloVer.get(`${ruta}/exportar`)).estado).toBe(403);
    expect((await soloVer.get(ruta)).estado).toBe(200);
    expect((await soloExportar.get(`${ruta}/exportar`)).estado).toBe(200);
  });

  it('el Excel lleva las secciones, la marca de mes anterior y la leyenda', async () => {
    const exportado = await escenario.cuenta.propietario.get(`${RUTA}/ajustes-del-mes/exportar?mes=${MES}`);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;
    const filas = Array.from({ length: hoja.rowCount }, (_, i) =>
      (hoja.getRow(i + 1).values as unknown[])
        .slice(1)
        .map((valor) => String(valor ?? ''))
        .join('|'),
    );

    for (const inicio of ['Ajustes del mes|', 'Anulaciones de ajustes de otros meses|', 'Aplicaciones manuales|']) {
      expect(
        filas.some((fila) => fila.startsWith(inicio)),
        inicio,
      ).toBe(true);
    }
    expect(filas.some((fila) => fila.startsWith('Pagos a la cuenta de apertura|'))).toBe(true);
    expect(filas.some((fila) => fila.startsWith('Documentos anulados|') && fila.includes('De un mes anterior'))).toBe(
      true,
    );
    expect(filas.some((fila) => fila.startsWith('Documentos desautorizados|'))).toBe(true);
  });
});
