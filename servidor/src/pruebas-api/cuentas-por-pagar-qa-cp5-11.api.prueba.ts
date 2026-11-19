/**
 * Lo que dejó la QA de punta a punta CP5-11 (informe `docs/modulos/informe-qa-cp5-11-2026-11-18.md`):
 * - R1 al cierre de un mes no cambia al anular después un pago de ese mes, y R3 (interna y para el proveedor) cierra con
 *   el mismo saldo que R1;
 * - R1 menos R11 al mismo corte cuadra con la transitoria de las notas marcadas sin aplicar;
 * - un posfechado ya cobrado (conciliación autorizada) rebaja la deuda y no queda comprometido, igual que en R1/R2.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { HOY, consultar } from './soporte/escenario-de-documentos.js';
import { conceptoGeneral } from './soporte/escenarios-de-bancos.js';

const RUTA = '/api/cuentas-por-pagar/reportes';
const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let conciliacionDeAbril: string;

/** Un cargo de Q11,200.00 (Q180.00 de retención de IVA) emitido el 1 de febrero de 2026. */
async function cargoAntiguo() {
  const { proveedor, cargo } = await e.proveedorConCargo('11200.00');
  await consultar(
    `update cuentas_por_pagar.documentos set fecha_emision = '2026-02-01', vencimiento = '2026-03-01' where id = $1`,
    [cargo],
  );
  return { proveedorId: proveedor.proveedorId, cargo };
}

const r1 = async (corte: string, proveedorId: string) => {
  const respuesta = await e
    .propietario()
    .get(`${RUTA}/saldos-por-proveedor?corte=${corte}&proveedorId=${proveedorId}&incluirSinSaldo=true`);
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(200);
  return respuesta.cuerpo;
};

const saldoDe = (reporte: { acreedores: Array<{ saldoNeto: string }>; deudores: Array<{ saldoNeto: string }> }) =>
  reporte.acreedores[0]?.saldoNeto ?? `-${reporte.deudores[0]?.saldoNeto ?? '0.00'}`;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpqacpoe');
  const { cuenta } = e.mundo.escenario;
  const inicio = await cuenta.propietario.put(`/api/empresas/${cuenta.empresaId}/carga-inicial`, {
    fechaDeInicio: '2026-01-01',
  });
  expect(inicio.estado, JSON.stringify(inicio.cuerpo)).toBe(200);
  const [conciliacion] = await consultar<{ id: string }>(
    `insert into bancos.conciliaciones (empresa_id, cuenta_bancaria_id, anio, mes, estado, previa_al_saldo_transcrito)
     values ($1, $2, 2026, 4, 'autorizada', true) returning id`,
    [cuenta.empresaId, e.cuentaBancariaId],
  );
  conciliacionDeAbril = conciliacion!.id;
}, 60_000);

describe('un pago de abril anulado después del cierre de abril', () => {
  it('R1 de abril no cambia, y R3 interna y para el proveedor cierran con el mismo saldo', async () => {
    const { proveedorId, cargo } = await cargoAntiguo();
    const pago = await e.pagar(e.cheque(proveedorId, [{ cargoId: cargo, monto: '5000.00' }]));
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);
    await consultar(`update cuentas_por_pagar.pagos set fecha = '2026-04-10' where id = $1`, [pago.cuerpo.id]);
    await consultar(`update bancos.movimientos set fecha = '2026-04-10' where id = $1`, [pago.cuerpo.movimiento.id]);
    // Con el mes de la cuenta conciliado (la conciliación de abril de `beforeAll`) Bancos anula con un movimiento inverso
    // fechado hoy; sin conciliar, el pago «nunca existió» y la anulación vale desde la fecha del pago (diseño de CP4 §5.9).
    const antes = await r1('2026-04-30', proveedorId);

    const anulado = await e
      .propietario()
      .post(`/api/cuentas-por-pagar/pagos/${pago.cuerpo.id}/anular`, { motivo: 'Cheque devuelto', fecha: HOY });
    expect(anulado.estado, JSON.stringify(anulado.cuerpo)).toBe(200);

    const despues = await r1('2026-04-30', proveedorId);
    expect(saldoDe(antes)).toBe('6020.00');
    expect(saldoDe(despues)).toBe(saldoDe(antes));
    expect(saldoDe(await r1(HOY, proveedorId))).toBe('11020.00');
    for (const presentacion of ['interna', 'para_el_proveedor']) {
      const consulta = `proveedorId=${proveedorId}&desde=2026-02-01&hasta=2026-04-30&presentacion=${presentacion}`;
      const estado = await e.propietario().get(`${RUTA}/estado-de-cuenta?${consulta}`);
      expect(estado.estado, JSON.stringify(estado.cuerpo)).toBe(200);
      expect(estado.cuerpo.totales.saldoFinal).toBe(saldoDe(antes));
    }
  });
});

describe('R1 menos R11', () => {
  it('la conciliación de R1 resta lo mismo que suma R11 con una nota marcada sin aplicar', async () => {
    const propietario = e.propietario();
    const nota = await propietario.post('/api/bancos/notas', {
      cuentaBancariaId: e.cuentaBancariaId,
      tipo: 'debito',
      fecha: HOY,
      monto: '800.00',
      referencia: 'Débito sin aplicar',
      beneficiario: 'Proveedor sin aplicar',
      observaciones: null,
      marcarParaCuentasPorPagar: true,
      conceptoId: await conceptoGeneral(propietario),
    });
    expect(nota.estado, JSON.stringify(nota.cuerpo)).toBe(201);

    const reporte = (await propietario.get(`${RUTA}/saldos-por-proveedor?corte=${HOY}`)).cuerpo;
    const sinAplicar = (await propietario.get(`${RUTA}/notas-sin-aplicar?corte=${HOY}`)).cuerpo;

    expect(sinAplicar.total.disponible).toBe('800.00');
    expect(reporte.conciliacion.pagosPorAplicar).toBe(sinAplicar.total.disponible);
    expect(Number(reporte.conciliacion.saldoNetoDelAuxiliar) - 800).toBeCloseTo(
      Number(reporte.conciliacion.proveedoresNetoDePagosPorAplicar),
      2,
    );
  });
});

describe('un posfechado cobrado antes de su fecha, con la conciliación autorizada', () => {
  async function conPosfechadoCobrado() {
    const { proveedorId, cargo } = await cargoAntiguo();
    const pago = await e.pagar(e.cheque(proveedorId, [{ cargoId: cargo, monto: '2000.00' }], { fecha: '2090-01-01' }));
    expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);
    await consultar(`update cuentas_por_pagar.pagos set fecha = '2026-12-30', creado_en = '2026-04-12' where id = $1`, [
      pago.cuerpo.id,
    ]);
    await consultar('update bancos.movimientos set conciliacion_id = $2 where id = $1', [
      pago.cuerpo.movimiento.id,
      conciliacionDeAbril,
    ]);
    return proveedorId;
  }

  it('R1 de fin de abril ya lo rebaja y no lo deja como comprometido', async () => {
    const proveedorId = await conPosfechadoCobrado();

    const reporte = await r1('2026-04-30', proveedorId);

    expect(reporte.acreedores[0]).toMatchObject({ saldoNeto: '9020.00', comprometido: '0.00' });
  });

  it('la deuda de la ficha del proveedor es la misma de R1 hoy', async () => {
    const proveedorId = await conPosfechadoCobrado();

    const ficha = (await e.propietario().get(`/api/cuentas-por-pagar/proveedores/${proveedorId}/saldo`)).cuerpo;
    const reporte = await r1(HOY, proveedorId);

    expect(ficha.porPagar).toBe(saldoDe(reporte));
  });
});
