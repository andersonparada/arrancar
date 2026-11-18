/**
 * Lo que dejó la QA intermedia del 2026-11-18 (informe `docs/modulos/informe-qa-intermedia-2026-11-18.md`):
 * - una nota ligada a pagos sigue ofreciendo «Desmarcar», «Eliminar» y «Reclasificar» aunque el servidor las rechaza
 *   (error conocido: las pruebas `it.fails` pasan mientras siga así; al corregirlo, quitar `.fails`);
 * - un cheque posfechado se ve distinto en la ficha del documento (comprometido, saldo cero) y en el reporte de
 *   documentos a una fecha (en parte, con el saldo completo): es a propósito (NIIF para las Pymes, sección 11), así que
 *   se fija para que un cambio no pase desapercibido.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDePagos, RUTA_DE_PAGOS } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY, haceDias } from './soporte/escenario-de-documentos.js';
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
  it('la ficha lo da por comprometido y el reporte a una fecha deja el saldo entero (por diseño)', async () => {
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

    expect(ficha).toMatchObject({ estadoDePago: 'comprometido', saldo: '0.00', comprometido: '1120.00' });
    expect(saldoDelProveedor).toMatchObject({ porPagar: '0.00', cargosConSaldo: 0 });
    expect(fila).toMatchObject({ estadoDePago: 'en_parte', saldo: '1120.00', comprometido: '1120.00' });
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
