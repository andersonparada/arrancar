/**
 * El estado de cuenta del proveedor (R3, CP5-3) sobre el escenario completo de CP5-2: saldos iniciales, un documento del
 * libro anterior a la fecha de inicio, pagos hechos, posfechados y anulados, un ajuste y un reintegro. Prueba la invariante 2
 * (el saldo final es el de R1) en las dos presentaciones y a varios rangos, y que un rango pasado no cambia al anular
 * después. Las anulaciones van al final porque cambian lo sembrado.
 */
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import { anularAjuste } from './soporte/cuentas-por-pagar-notas.js';
import {
  anularDocumentoEnLaBase,
  anularPagoEnLaBase,
  anularReintegroEnLaBase,
} from './soporte/cuentas-por-pagar-reportes.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, HOY } from './soporte/escenario-de-documentos.js';
import { CORTE, prepararMundoDeSaldos, type MundoDeSaldos } from './soporte/escenario-de-reportes-de-saldos.js';
import { darDeAltaCuenta } from './soporte/escenarios.js';

const RUTA = '/api/cuentas-por-pagar/reportes';
const R1 = `${RUTA}/saldos-por-proveedor`;
const R3 = `${RUTA}/estado-de-cuenta`;
const entorno = usarEntornoApi();
let m: MundoDeSaldos;

beforeAll(async () => {
  m = await prepararMundoDeSaldos(entorno, 'cxprepestado');
}, 60_000);

const propietario = () => m.escenario.cuenta.propietario;
const centavos = (texto: string) => Math.round(Number(texto) * 100);

/** El saldo neto del proveedor en R1 a un corte (deudor en negativo; cero si no sale). */
async function saldoDeR1(proveedorId: string, corte: string): Promise<number> {
  const respuesta = await propietario().get(`${R1}?corte=${corte}&proveedorId=${proveedorId}&incluirSinSaldo=true`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  const [acreedor] = respuesta.cuerpo.acreedores;
  const [deudor] = respuesta.cuerpo.deudores;
  if (acreedor) return centavos(acreedor.saldoNeto);
  return deudor ? -centavos(deudor.saldoNeto) : 0;
}

async function estado(proveedorId: string, [desde, hasta]: readonly [string, string], extra = '') {
  const url = `${R3}?proveedorId=${proveedorId}&desde=${desde}&hasta=${hasta}${extra}`;
  const respuesta = await propietario().get(url);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
}

const RANGOS: Array<[string, string]> = [
  ['2026-01-01', CORTE],
  ['2026-10-01', CORTE],
  ['2026-06-01', HOY],
  ['2026-11-01', HOY],
];

const resumen = (lineas: Array<{ fecha: string; cargo: string | null; abono: string | null; saldo: string | null }>) =>
  lineas.map(({ fecha, cargo, abono, saldo }) => [fecha, cargo, abono, saldo]);

describe('permisos', () => {
  it('pide sesión, el módulo y el permiso de ver o de exportar', async () => {
    const sinModulo = await darDeAltaCuenta(entorno, {
      nombre: 'Sin cxp',
      usuario: 'sincxpestado',
      modulos: ['terceros'],
    });
    const ruta = `${R3}?proveedorId=${m.proveedores.alfa}`;

    expect((await entorno.nuevoCliente().get(ruta)).estado).toBe(401);
    expect((await sinModulo.propietario.get(ruta)).estado).toBe(403);
    expect((await m.soloExportar.get(ruta)).estado).toBe(403);
    expect((await m.soloVer.get(`${R3}/exportar?proveedorId=${m.proveedores.alfa}`)).estado).toBe(403);
    expect((await m.soloVer.get(ruta)).estado).toBe(200);
    expect((await m.soloExportar.get(`${R3}/exportar?proveedorId=${m.proveedores.alfa}`)).estado).toBe(200);
  });

  it('rechaza un proveedor que no existe, un rango al revés y uno de más de 24 meses', async () => {
    const inexistente = await propietario().get(`${R3}?proveedorId=00000000-0000-4000-8000-000000000000`);
    const alReves = await propietario().get(
      `${R3}?proveedorId=${m.proveedores.alfa}&desde=2026-10-31&hasta=2026-10-01`,
    );
    const muyLargo = await propietario().get(
      `${R3}?proveedorId=${m.proveedores.alfa}&desde=2026-01-01&hasta=2029-01-01`,
    );

    expect(inexistente.estado).toBe(404);
    expect(alReves.cuerpo.error.codigo).toBe('rango_de_reporte_invalido');
    expect(muyLargo.cuerpo.error.codigo).toBe('rango_de_reporte_muy_largo');
  });
});

describe('el estado de cuenta de Alfa en octubre', () => {
  it('parte del saldo anterior y mueve el saldo con cada pago, baja y ajuste, sin los posfechados', async () => {
    const reporte = await estado(m.proveedores.alfa, ['2026-10-01', CORTE]);

    expect(reporte.totales).toEqual({
      saldoAnterior: '1250.00',
      cargos: '50.00',
      abonos: '90.00',
      saldoFinal: '1210.00',
    });
    expect(resumen(reporte.lineas)).toEqual([
      ['2026-10-05', null, '40.00', '1210.00'],
      ['2026-10-15', '50.00', null, '1260.00'],
      ['2026-10-25', null, '50.00', '1210.00'],
    ]);
    expect(reporte.lineas[1].concepto).toContain('Baja del saldo a favor de Nota de crédito S-N1');
    expect(reporte.alCorte).toEqual({ comprometido: '100.00', disponible: '1110.00' });
  });
});

describe('invariante 2: el saldo final es el neto de R1 al mismo día, en las dos presentaciones', () => {
  it('cuadra para cada proveedor y cada rango', async () => {
    for (const proveedorId of [...Object.values(m.proveedores), m.escenario.proveedorId]) {
      for (const [desde, hasta] of RANGOS) {
        const esperado = await saldoDeR1(proveedorId, hasta);
        const interna = await estado(proveedorId, [desde, hasta]);
        const paraElProveedor = await estado(proveedorId, [desde, hasta], '&presentacion=para_el_proveedor');

        expect(centavos(interna.totales.saldoFinal), `${proveedorId} ${desde}..${hasta}`).toBe(esperado);
        expect(paraElProveedor.totales.saldoFinal).toBe(interna.totales.saldoFinal);
        expect(centavos(interna.totales.saldoAnterior)).toBe(await saldoDeR1(proveedorId, sumarUnDia(desde, -1)));
      }
    }
  });
});

function sumarUnDia(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
}

describe('el documento del libro anterior a la fecha de inicio', () => {
  it('cuenta desde la fecha de inicio: interna por el neto y, para el proveedor, por el total con la retención como abono', async () => {
    const [libro] = await consultar<{ documento_id: string }>(
      'select documento_id from cuentas_por_pagar.documentos where id = $1',
      [m.delLibro],
    );
    await consultar(
      `insert into libro_de_compras.retenciones (empresa_id, documento_id, impuesto, regla, base, porcentaje,
         monto_propuesto, monto, fecha, constancia_numero, constancia_fecha)
       select $1::uuid, $2::uuid, 'iva', 'iva_otro_agente', 1000, 15, 70, 70, '2026-01-01'::date, 'C-9', '2026-01-05'::date
       union all select $1::uuid, $2::uuid, 'isr', 'isr_opcional_simplificado', 1000, null, 50, 50, '2026-01-01'::date, null, null::date`,
      [m.escenario.cuenta.empresaId, libro!.documento_id],
    );

    const interna = await estado(m.escenario.proveedorId, ['2026-01-01', '2026-01-31']);
    const paraElProveedor = await estado(
      m.escenario.proveedorId,
      ['2026-01-01', '2026-01-31'],
      '&presentacion=para_el_proveedor',
    );

    expect(interna.lineas).toMatchObject([
      { fecha: '2026-01-01', total: '1120.00', retenciones: '120.00', cargo: '1000.00', saldo: '1000.00' },
    ]);
    expect(paraElProveedor.lineas).toMatchObject([
      { cargo: '1120.00', saldo: '1120.00' },
      { concepto: 'Retención de IVA, constancia C-9', abono: '70.00', saldo: '1050.00' },
      { concepto: 'Retención de ISR, constancia pendiente', abono: '50.00', saldo: '1000.00' },
    ]);
    expect(paraElProveedor.alCorte).toBeUndefined();
    expect(paraElProveedor.leyendas).toEqual([]);
  });
});

describe('invariante 4: un rango pasado no cambia al anular después, y lo anulado aparece en su día', () => {
  it('anular un pago, un ajuste, un reintegro y un documento deja octubre igual y pone la reversa en su fecha', async () => {
    const antes = await estado(m.proveedores.alfa, ['2026-10-01', CORTE]);
    const reintegroAntes = await estado(m.proveedores.beta, ['2026-10-01', CORTE]);
    const libroAntes = await estado(m.escenario.proveedorId, ['2026-01-01', CORTE]);

    await anularPagoEnLaBase(m.pagoQueSeAnula);
    await anularAjuste(m.escenario, m.ajusteQueSeAnula);
    await anularReintegroEnLaBase(m.reintegroQueSeAnula);
    await anularDocumentoEnLaBase(m.delLibro);

    expect(await estado(m.proveedores.alfa, ['2026-10-01', CORTE])).toEqual(antes);
    expect(await estado(m.proveedores.beta, ['2026-10-01', CORTE])).toEqual(reintegroAntes);
    expect(await estado(m.escenario.proveedorId, ['2026-01-01', CORTE])).toEqual(libroAntes);
    const hoy = await estado(m.proveedores.alfa, ['2026-11-01', HOY]);
    expect(hoy.totales).toEqual({ saldoAnterior: '1210.00', cargos: '40.00', abonos: '50.00', saldoFinal: '1200.00' });
    expect(hoy.lineas.map(({ hecho }: { hecho: string }) => hecho).sort()).toEqual([
      'anulacion_de_ajuste',
      'anulacion_de_pago',
    ]);
    const beta = await estado(m.proveedores.beta, ['2026-11-01', HOY]);
    expect(beta.lineas).toMatchObject([{ hecho: 'anulacion_de_reintegro', abono: '100.00' }]);
    const libro = await estado(m.escenario.proveedorId, ['2026-11-01', HOY]);
    expect(libro.lineas).toMatchObject([{ hecho: 'anulacion_de_documento', abono: '1000.00', saldo: '0.00' }]);
  });

  it('lo que nació y se anuló dentro del mismo rango no suma: sale en gris solo con «mostrar anulados»', async () => {
    const sin = await estado(m.proveedores.alfa, ['2026-10-01', HOY]);
    const con = await estado(m.proveedores.alfa, ['2026-10-01', HOY], '&mostrarAnulados=true');

    expect(con.lineas.length).toBe(sin.lineas.length + 2);
    const enGris = con.lineas.filter((linea: { anulada: boolean }) => linea.anulada);
    expect(enGris).toMatchObject([{ saldo: null }, { saldo: null }]);
    expect(enGris.map(({ hecho }: { hecho: string }) => hecho).sort()).toEqual(['baja_de_saldo_a_favor', 'pago']);
    expect(con.totales).toEqual(sin.totales);
    expect(centavos(sin.totales.saldoFinal)).toBe(await saldoDeR1(m.proveedores.alfa, HOY));
  });

  it('con todo anulado el estado sigue cuadrando con R1 en todos los rangos', async () => {
    for (const proveedorId of [...Object.values(m.proveedores), m.escenario.proveedorId]) {
      for (const [desde, hasta] of RANGOS) {
        const reporte = await estado(proveedorId, [desde, hasta], '&presentacion=para_el_proveedor');
        expect(centavos(reporte.totales.saldoFinal), `${proveedorId} ${desde}..${hasta}`).toBe(
          await saldoDeR1(proveedorId, hasta),
        );
      }
    }
  });
});

describe('el Excel', () => {
  it('lleva el saldo anterior, las líneas, los totales y las notas con el proveedor y el rango', async () => {
    const exportado = await m.soloExportar.get(
      `${R3}/exportar?proveedorId=${m.proveedores.alfa}&desde=2026-10-01&hasta=${CORTE}`,
    );
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;
    const textos = Array.from({ length: hoja.rowCount }, (_, i) =>
      (hoja.getRow(i + 1).values as unknown[])
        .slice(1)
        .map((valor) => String(valor ?? ''))
        .join('|'),
    );

    expect(textos.some((fila) => fila.startsWith('Saldo anterior|') && fila.includes('1250'))).toBe(true);
    expect(textos.filter((fila) => fila.startsWith('Línea|'))).toHaveLength(3);
    expect(textos.some((fila) => fila.startsWith('Total|') && fila.includes('1210'))).toBe(true);
    expect(textos.some((fila) => fila.startsWith('Nota|') && fila.includes('Alfa S.A.'))).toBe(true);
  });
});
