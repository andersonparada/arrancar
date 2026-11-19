/**
 * Lo que dejó la QA de punta a punta de CP4-12 (informe `docs/modulos/informe-qa-cp4-12-2026-11-18.md`). Las pruebas
 * `it.fails` fijan el error que siga abierto (al corregirlo, quitar `.fails`). Corregido:
 * - el pago con cheque o nota de débito limita `observaciones` y `referencia` en el esquema http (400 por campo);
 * - un cheque posfechado anulado deja de contar como comprometido en la ficha, R1, R2 y el reporte de posfechados al corte
 *   de hoy, aunque su anulación quede con la fecha contable (futura) del cheque;
 * - el reporte de cheques caducos rotula `origen: 'suelto'` aunque el cheque lo haya emitido un pago de Cuentas por pagar.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { anularPago, moverFechaDelPago } from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias, HOY } from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpqacuatrodoce');
});

describe('textos largos al pagar con cheque o con nota de débito', () => {
  it('guarda el pago con observaciones y referencia dentro del límite', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();

    const respuesta = await e.pagar(
      e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '100.00' }], {
        observaciones: 'o'.repeat(500),
        referencia: 'r'.repeat(100),
      }),
    );

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  });

  it('rechaza con 400 unas observaciones de más de 500 caracteres', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();

    const respuesta = await e.pagar(
      e.nota(proveedor.proveedorId, [{ cargoId: cargo, monto: '100.00' }], { observaciones: 'o'.repeat(501) }),
    );

    expect(respuesta.estado).toBe(400);
  });

  it('rechaza con 400 una referencia de más de 100 caracteres', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();

    const respuesta = await e.pagar(
      e.nota(proveedor.proveedorId, [{ cargoId: cargo, monto: '100.00' }], { referencia: 'r'.repeat(101) }),
    );

    expect(respuesta.estado).toBe(400);
  });
});

describe('el origen de un cheque en el reporte de cheques caducos', () => {
  // Error conocido: `ReporteDeChequesCaducos` pone `origen: 'suelto'` a todos (el comentario dice que aún no hay pagos).
  it.fails('dice que el cheque de un pago de Cuentas por pagar viene de Cuentas por pagar', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '300.00' }]));
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);
    await moverFechaDelPago(pago.cuerpo.id, haceDias(45));

    const reporte = await e.propietario().get('/api/bancos/cheques-caducos?meses=1');

    expect(reporte.estado).toBe(200);
    const fila = (reporte.cuerpo.cheques as Array<{ numero: number; origen: string }>).find(
      (cheque) => cheque.numero === pago.cuerpo.movimiento.numero,
    );
    expect(fila?.origen).toBe('cuentas_por_pagar');
  });
});

describe('un cheque posfechado anulado hoy', () => {
  it('deja de contar como comprometido en la ficha del proveedor y del documento', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = await e.pagar(
      e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '700.00' }], { fecha: haceDias(-20) }),
    );
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);

    const anulado = await anularPago(e.propietario(), pago.cuerpo.id);

    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);
    const saldo = (await e.propietario().get(`/api/cuentas-por-pagar/proveedores/${proveedor.proveedorId}/saldo`))
      .cuerpo;
    const ficha = (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${cargo}`)).cuerpo;
    expect(saldo).toMatchObject({ comprometido: '0.00', disponible: '1120.00' });
    expect(ficha).toMatchObject({ comprometido: '0.00', estadoDePago: 'pendiente' });
  });

  it('tampoco cuenta en R1, R2 ni en el reporte de cheques posfechados al corte de hoy', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = await e.pagar(
      e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '700.00' }], { fecha: haceDias(-20) }),
    );
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);
    expect((await anularPago(e.propietario(), pago.cuerpo.id)).estado).toBe(200);

    const base = '/api/cuentas-por-pagar/reportes';
    const posfechados = (
      await e.propietario().get(`${base}/cheques-posfechados?corte=${HOY}&proveedorId=${proveedor.proveedorId}`)
    ).cuerpo;
    const r2 = (await e.propietario().get(`${base}/documentos?corte=${HOY}&proveedorId=${proveedor.proveedorId}`))
      .cuerpo;
    const r1 = (
      await e.propietario().get(`${base}/saldos-por-proveedor?corte=${HOY}&proveedorId=${proveedor.proveedorId}`)
    ).cuerpo;

    expect(posfechados.total.monto).toBe('0.00');
    expect(r2.totales.comprometido).toBe('0.00');
    expect(r1.totales.acreedores.comprometido).toBe('0.00');
  });
});

describe('el corte histórico de un cheque posfechado anulado hoy', () => {
  const base = '/api/cuentas-por-pagar/reportes';

  /** Un cargo y su cheque posfechado de Q700.00, hechos hace diez días y anulados hoy. */
  async function posfechadoAnuladoHoy() {
    const { proveedor, cargo } = await e.proveedorConCargo();
    await consultar(
      `update cuentas_por_pagar.documentos set fecha_emision = $2::date, vencimiento = $3::date, creado_en = $2::timestamptz where id = $1`,
      [cargo, haceDias(10), haceDias(-30)],
    );
    const pago = await e.pagar(
      e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '700.00' }], { fecha: haceDias(-20) }),
    );
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);
    await consultar('update cuentas_por_pagar.pagos set creado_en = $2::timestamptz where id = $1', [
      pago.cuerpo.id,
      haceDias(5),
    ]);
    expect((await anularPago(e.propietario(), pago.cuerpo.id)).estado).toBe(200);
    return proveedor.proveedorId as string;
  }

  it('antes de anularse sigue comprometido en R1, R2 y el reporte de posfechados, y desde hoy ya no', async () => {
    const proveedorId = await posfechadoAnuladoHoy();
    const al = async (ruta: string, corte: string) =>
      (await e.propietario().get(`${base}/${ruta}?corte=${corte}&proveedorId=${proveedorId}`)).cuerpo;

    const antes = haceDias(2);
    expect((await al('cheques-posfechados', antes)).total.monto).toBe('700.00');
    expect((await al('documentos', antes)).totales.comprometido).toBe('700.00');
    expect((await al('saldos-por-proveedor', antes)).totales.acreedores.comprometido).toBe('700.00');
    expect((await al('cheques-posfechados', HOY)).total.monto).toBe('0.00');
    expect((await al('documentos', HOY)).totales.comprometido).toBe('0.00');
    expect((await al('saldos-por-proveedor', HOY)).totales.acreedores.comprometido).toBe('0.00');
  });
});
