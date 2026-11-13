/**
 * Cuadre de los saldos iniciales (U8-7): totales separados por proveedor y generales, neto negativo, permisos de ver y
 * exportar, y el Excel con la fila del total.
 */
import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import '../modulos/core/contratos/cuentas-por-pagar.contratos.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  prepararEscenario,
  registrarProveedor,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos, darDeAltaCuenta } from './soporte/escenarios.js';

const RUTA = '/api/cuentas-por-pagar/saldos-iniciales';
const CUADRE = `${RUTA}/cuadre`;
const PERMISOS = 'cuentas-por-pagar.saldos-iniciales';
const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let otroProveedorId: string;
let soloVer: ClienteApi;
let soloExportar: ClienteApi;

const propietario = () => escenario.cuenta.propietario;
const factura = (cambios: Record<string, unknown>) => ({
  proveedorId: escenario.proveedorId,
  tipo: 'factura',
  serie: 'a',
  numero: '1',
  fechaEmision: '2025-12-20',
  vencimiento: '2026-01-20',
  total: '1120.00',
  retenciones: '120.00',
  retencionesPorPracticar: '20.00',
  saldoPendiente: '700.00',
  referencia: null,
  ...cambios,
});
const cargar = async (cambios: Record<string, unknown>) => {
  const respuesta = await propietario().post(RUTA, factura(cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
};

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpcuadre', MODULOS_DE_CUENTAS_POR_PAGAR);
  otroProveedorId = (await registrarProveedor(escenario.cuenta, 'Distribuidora Norte')).proveedorId;
  const usuario = (nombres: string, permiso: string) =>
    crearUsuarioConPermisos(entorno, escenario.cuenta, {
      nombres,
      apellidos: 'Cuadre',
      permisos: [`${PERMISOS}.${permiso}`],
    });
  soloVer = await usuario('Solo ver', 'ver');
  soloExportar = await usuario('Solo exportar', 'exportar');
  await propietario().put(`/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`, {
    fechaDeInicio: '2026-01-01',
  });
});

describe('permisos', () => {
  it('sin sesión 401, sin el módulo 403, y cada ruta pide el permiso de su acción', async () => {
    const sinModulo = await darDeAltaCuenta(entorno, {
      nombre: 'Sin cxp',
      usuario: 'sincxpcuadre',
      modulos: ['terceros'],
    });

    expect((await entorno.nuevoCliente().get(CUADRE)).estado).toBe(401);
    expect((await sinModulo.propietario.get(CUADRE)).estado).toBe(403);
    expect((await soloExportar.get(CUADRE)).estado).toBe(403);
    expect((await soloVer.get(`${CUADRE}/exportar`)).estado).toBe(403);
    expect((await soloVer.get(CUADRE)).estado).toBe(200);
    expect((await soloExportar.get(`${CUADRE}/exportar`)).estado).toBe(200);
  });
});

describe('el cuadre', () => {
  it('sin saldos cargados está vacío y en cero', async () => {
    const respuesta = await soloVer.get(CUADRE);

    expect(respuesta.cuerpo).toEqual({
      carga: { fechaDeInicio: '2026-01-01', cerrada: false },
      proveedores: [],
      general: { documentos: 0, cargos: '0.00', notasAFavor: '0.00', neto: '0.00', retencionesPorPracticar: '0.00' },
    });
  });

  it('separa cargos, notas a favor, neto y retenciones; un proveedor puede quedar con neto negativo', async () => {
    await cargar({ numero: '1', saldoPendiente: '700.00' });
    await cargar({ numero: '2', saldoPendiente: '300.50', retencionesPorPracticar: '0.00' });
    await cargar({
      numero: '3',
      tipo: 'nota_de_credito',
      vencimiento: null,
      total: '500.00',
      retenciones: '0.00',
      retencionesPorPracticar: '0.00',
      saldoPendiente: '500.00',
    });
    await cargar({
      numero: '4',
      proveedorId: otroProveedorId,
      tipo: 'nota_de_credito',
      vencimiento: null,
      total: '80.00',
      retenciones: '0.00',
      retencionesPorPracticar: '0.00',
      saldoPendiente: '80.00',
    });

    const { cuerpo } = await soloVer.get(CUADRE);

    expect(cuerpo.proveedores).toMatchObject([
      { proveedorNombre: 'Distribuidora Norte', documentos: 1, cargos: '0.00', notasAFavor: '80.00', neto: '-80.00' },
      {
        proveedorId: escenario.proveedorId,
        documentos: 3,
        cargos: '1000.50',
        notasAFavor: '500.00',
        neto: '500.50',
        retencionesPorPracticar: '20.00',
      },
    ]);
    expect(cuerpo.general).toEqual({
      documentos: 4,
      cargos: '1000.50',
      notasAFavor: '580.00',
      neto: '420.50',
      retencionesPorPracticar: '20.00',
    });
  });
});

describe('el Excel del cuadre', () => {
  it('trae una fila por proveedor y la del total', async () => {
    const exportado = await soloExportar.get(`${CUADRE}/exportar`);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;
    const filas = Array.from({ length: hoja.rowCount }, (_, i) =>
      (hoja.getRow(i + 1).values as unknown[]).slice(1).map((valor) => String(valor ?? '')),
    );
    const ultima = filas.at(-1)!;

    expect(exportado.estado).toBe(200);
    expect(filas.some((fila) => fila.includes('Distribuidora Norte'))).toBe(true);
    expect(ultima).toContain('Total');
    expect(ultima.map((valor) => valor.replace(/\.0+$/, ''))).toEqual(expect.arrayContaining(['4']));
  });
});
