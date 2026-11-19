/**
 * El Excel de los reportes de Caja chica (CC-10) y los permisos de ver y de exportar de cada ruta.
 */

import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { EscenarioDeComprobantes } from './soporte/caja-chica-comprobantes.js';
import { prepararEscenarioDeReportes, RUTA_DE_REPORTES } from './soporte/caja-chica-reportes.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { haceDias, HOY } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';

const RUTA = RUTA_DE_REPORTES;
const entorno = usarEntornoApi();
let e: EscenarioDeComprobantes;

beforeAll(async () => {
  ({ e } = await prepararEscenarioDeReportes(entorno, 'cajachicareportesexcel'));
});

describe('Excel y permisos', () => {
  const RUTAS = ['pendientes-de-reponer', 'reposiciones', 'sin-documento-fiscal', 'estado-de-fondos', 'arqueos'];

  async function filasDe(ruta: string): Promise<string[]> {
    const exportado = await e.propietario().get(`${RUTA}/${ruta}`);
    expect(exportado.estado).toBe(200);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(exportado.cuerpo as unknown as ExcelJS.Buffer);
    const hoja = libro.worksheets[0]!;
    return Array.from({ length: hoja.rowCount }, (_, i) =>
      (hoja.getRow(i + 1).values as unknown[])
        .slice(1)
        .map((valor) => String(valor ?? ''))
        .join('|'),
    );
  }

  it('CC-R1 exporta los comprobantes, los subtotales por fondo y el total', async () => {
    const filas = await filasDe(`pendientes-de-reponer/exportar?corte=${HOY}`);

    expect(filas.some((f) => f.startsWith('Comprobante|Caja de reportes A|Vale ') && f.includes('|50'))).toBe(true);
    expect(filas.filter((f) => f.startsWith('Subtotal|'))).toHaveLength(2);
    expect(filas.some((f) => f.startsWith('Total|'))).toBe(true);
    expect(filas.some((f) => f.startsWith('Nota|') && f.includes('Pendiente de reponer al'))).toBe(true);
  });

  it('CC-R2 exporta las reposiciones y los conceptos', async () => {
    const filas = await filasDe(`reposiciones/exportar?desde=${haceDias(10)}&hasta=${HOY}`);

    expect(filas.some((f) => f.startsWith('Reposición|Caja de reportes A|Reposición ') && f.includes('|Cheque '))).toBe(
      true,
    );
    expect(filas.some((f) => f.startsWith('Concepto|Caja de reportes A') && f.includes('|Medicinas|1120|0|1120'))).toBe(
      true,
    );
  });

  it('CC-R3, CC-R4 y CC-R5 exportan sus filas', async () => {
    const sinDocumento = await filasDe('sin-documento-fiscal/exportar');
    const estado = await filasDe('estado-de-fondos/exportar');
    const arqueos = await filasDe(`arqueos/exportar?desde=${haceDias(1)}&hasta=${HOY}`);

    expect(sinDocumento.some((f) => f.includes('|Es un recibo FEL|'))).toBe(true);
    expect(estado.some((f) => f.startsWith('Fondo|Caja de reportes B|'))).toBe(true);
    expect(
      arqueos.some((f) => f.startsWith('Arqueo|Caja de reportes A|Arqueo ') && f.includes('|Pérdida del fondo|')),
    ).toBe(true);
  });

  it('pide el permiso de ver o de exportar de cada ruta', async () => {
    const permiso = (nombre: string, permisos: string[]) =>
      crearUsuarioConPermisos(entorno, e.caja.cuenta, { nombres: nombre, apellidos: 'Permisos', permisos });
    const soloVer = await permiso('Lector de reportes', ['caja-chica.reportes.ver']);
    const soloExportar = await permiso('Exportador de reportes', ['caja-chica.reportes.exportar']);
    const deFondos = await permiso('Lector de fondos', ['caja-chica.fondos.ver']);

    for (const ruta of RUTAS) {
      expect((await entorno.nuevoCliente().get(`${RUTA}/${ruta}`)).estado).toBe(401);
      expect((await deFondos.get(`${RUTA}/${ruta}`)).estado).toBe(403);
      expect((await soloExportar.get(`${RUTA}/${ruta}`)).estado).toBe(403);
      expect((await soloVer.get(`${RUTA}/${ruta}/exportar`)).estado).toBe(403);
      expect((await soloVer.get(`${RUTA}/${ruta}`)).estado).toBe(200);
      expect((await soloExportar.get(`${RUTA}/${ruta}/exportar`)).estado).toBe(200);
    }
  });
});
