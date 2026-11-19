/**
 * Lo que dejó la QA intermedia del 2026-11-18 (informe `docs/modulos/informe-qa-intermedia-2026-11-18.md`):
 * - una nota ligada a pagos sigue ofreciendo «Desmarcar», «Eliminar» y «Reclasificar» aunque el servidor las rechaza
 *   (error conocido: las pruebas `it.fails` pasan mientras siga así; al corregirlo, quitar `.fails`);
 * - un cheque posfechado se ve igual en la ficha, el proveedor y R2 (adenda 2026-11-18): la deuda sigue entera, lo
 *   comprometido va aparte, nada queda disponible y el estado es «Comprometido».
 */

import ExcelJS from 'exceljs';
import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDePagos, RUTA_DE_PAGOS } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY, consultar, haceDias } from './soporte/escenario-de-documentos.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpqaintermedia');
});

async function notaLigada(): Promise<string> {
  const { proveedor, cargo } = await e.proveedorConCargo();
  const creada = await e.propietario().post('/api/bancos/notas', {
    cuentaBancariaId: e.cuentaBancariaId,
    tipo: 'debito',
    fecha: HOY,
    monto: '800.00',
    referencia: 'Débito del banco',
    beneficiario: 'Aseguradora Prueba',
    observaciones: null,
    marcarParaCuentasPorPagar: true,
  });
  expect(creada.estado, JSON.stringify(creada.cuerpo)).toBe(201);
  const ligada = await e.propietario().post(`${RUTA_DE_PAGOS}/ligar`, {
    forma: 'nota_ligada',
    movimientoId: creada.cuerpo.id,
    proveedorId: proveedor.proveedorId,
    aplicaciones: [{ cargoId: cargo, monto: '500.00' }],
  });
  expect(ligada.estado, JSON.stringify(ligada.cuerpo)).toBe(201);
  return creada.cuerpo.id;
}

describe('las acciones que ofrece una nota ligada', () => {
  it('el servidor las rechaza aunque la nota las ofrezca (lo que hoy muestra el cliente)', async () => {
    const id = await notaLigada();
    const conceptoId = await conceptoGeneral(e.propietario());

    const desmarcar = await e
      .propietario()
      .post(`/api/bancos/notas/${id}/desmarcar`, { motivo: 'Intento', conceptoId });
    const eliminar = await e.propietario().delete(`/api/bancos/notas/${id}`, { motivo: 'Intento' });

    expect(desmarcar.cuerpo.error.codigo).toBe('movimiento_ligado_a_pagos');
    expect(eliminar.cuerpo.error.codigo).toBe('movimiento_ligado_a_pagos');
  });

  // Error conocido: `puedeDesmarcar`, `puedeEliminar` y `puedeReclasificar` siguen en `true` con la nota ya ligada, así
  // que el cliente muestra botones que solo producen un rechazo.
  it.fails('no ofrece desmarcar, eliminar ni reclasificar una nota ya ligada', async () => {
    const id = await notaLigada();

    const nota = (await e.propietario().get(`/api/bancos/notas/${id}`)).cuerpo;

    expect(nota).toMatchObject({ puedeDesmarcar: false, puedeEliminar: false, puedeReclasificar: false });
  });
});

describe('un cheque posfechado en la ficha y en los reportes', () => {
  it('la ficha y R2 dan la misma deuda y el mismo estado', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = await e.pagar(
      e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1120.00' }], { fecha: haceDias(-5) }),
    );
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);

    const ficha = (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${cargo}`)).cuerpo;
    const saldoDelProveedor = (
      await e.propietario().get(`/api/cuentas-por-pagar/proveedores/${proveedor.proveedorId}/saldo`)
    ).cuerpo;
    const reporte = (
      await e
        .propietario()
        .get(`/api/cuentas-por-pagar/reportes/documentos?corte=${HOY}&proveedorId=${proveedor.proveedorId}`)
    ).cuerpo;
    const fila = reporte.filas.find((f: { id: string }) => f.id === cargo);

    expect(ficha).toMatchObject({
      estadoDePago: 'comprometido',
      saldo: '1120.00',
      disponible: '0.00',
      comprometido: '1120.00',
    });
    expect(saldoDelProveedor).toMatchObject({
      porPagar: '1120.00',
      comprometido: '1120.00',
      disponible: '0.00',
      cargosConSaldo: 1,
    });
    expect(fila).toMatchObject({
      estadoDePago: 'comprometido',
      saldo: ficha.saldo,
      comprometido: '1120.00',
      disponible: '0.00',
    });
  });
});

describe('el origen de un cheque de Cuentas por pagar (QA intermedia, error 9)', () => {
  it('la lista de cheques de la empresa dice que lo generó Cuentas por pagar', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1120.00' }]));
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);

    const lista = (await e.propietario().get('/api/bancos/cheques')).cuerpo as { moduloDeOrigen: string | null }[];

    expect(lista.some((cheque) => cheque.moduloDeOrigen === 'cuentas-por-pagar')).toBe(true);
  });
});

describe('lo disponible para pagar con un saldo a favor y un posfechado por el total', () => {
  it('da 0.00 en R1, en R2 y en la ficha: lo que está a favor no resta lo disponible', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo('2240.00');
    const { documentos } = e.mundo;
    const datos = { proveedorId: proveedor.proveedorId, nitEmisor: proveedor.nitEmisor };
    const factura = await documentos.registrar({
      ...datos,
      lineas: [{ conceptoId: e.mundo.escenario.conceptoId, total: '1120.00' }],
    });
    await consultar('update cuentas_por_pagar.documentos set retenciones = 784 where documento_id = $1', [factura]);
    await documentos.registrarNota('NCRE', factura, { ...datos, total: '672.00' });
    const pago = await e.pagar(
      e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '2240.00' }], { fecha: haceDias(-5) }),
    );
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);

    const ruta = '/api/cuentas-por-pagar';
    const r1 = (
      await e
        .propietario()
        .get(`${ruta}/reportes/saldos-por-proveedor?corte=${HOY}&proveedorId=${proveedor.proveedorId}`)
    ).cuerpo;
    const r2 = (
      await e.propietario().get(`${ruta}/reportes/documentos?corte=${HOY}&proveedorId=${proveedor.proveedorId}`)
    ).cuerpo;
    const ficha = (await e.propietario().get(`${ruta}/documentos/${cargo}`)).cuerpo;
    const lista = (await e.propietario().get(`${ruta}/documentos?proveedorId=${proveedor.proveedorId}`)).cuerpo
      .elementos;

    expect(r1.acreedores[0]).toMatchObject({
      totalCargos: '2240.00',
      saldosAFavor: '336.00',
      comprometido: '2240.00',
      disponible: '0.00',
    });
    expect(r1.totales.acreedores.disponible).toBe('0.00');
    expect(r2.filas.find((f: { id: string }) => f.id === cargo)).toMatchObject({
      saldo: '2240.00',
      disponible: '0.00',
    });
    expect(r2.totales).toMatchObject({ saldo: '2240.00', comprometido: '2240.00', disponible: '0.00' });
    expect(ficha.disponible).toBe('0.00');
    const excel = await e
      .propietario()
      .get(`${ruta}/reportes/documentos/exportar?corte=${HOY}&proveedorId=${proveedor.proveedorId}`);
    expect(excel.estado).toBe(200);
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(excel.cuerpo as unknown as ExcelJS.Buffer);
    const encabezados = (libro.worksheets[0]!.getRow(1).values as unknown[]).map(String);
    expect(encabezados).toContain('Disponible para pagar');
    // Invariante 3 de diseno-cp5-reportes §2.5: con corte de hoy, lo disponible de R2 es el de la lista.
    for (const fila of r2.filas) {
      expect(lista.find((d: { id: string }) => d.id === fila.id)?.disponible, fila.id).toBe(fila.disponible);
    }
  });
});
