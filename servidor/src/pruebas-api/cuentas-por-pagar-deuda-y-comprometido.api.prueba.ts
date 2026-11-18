/**
 * Deuda, comprometido y disponible (adenda 2026-11-18 de `diseno-cp4-pagos.md`): con un cheque posfechado, `saldo` es la
 * deuda y el cargo sigue vencido; `disponible` y `comprometido` van al lado, los cinco estados de pago salen iguales en
 * la lista y la ficha, y pagar sobre lo comprometido sigue rechazado (protección contra el doble pago).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { EscenarioDePagos, RUTA_DE_PAGOS } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias } from './soporte/escenario-de-documentos.js';

const RUTA = '/api/cuentas-por-pagar';
const entorno = usarEntornoApi();
let e: EscenarioDePagos;

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxpdeudacomprometido');
});

const ficha = async (id: string) => (await e.propietario().get(`${RUTA}/documentos/${id}`)).cuerpo;
const lista = async (proveedorId: string, filtro = '') =>
  (await e.propietario().get(`${RUTA}/documentos?proveedorId=${proveedorId}${filtro}`)).cuerpo.elementos;

/** Un cargo de Q1,120.00 con un cheque posfechado de `monto` a cinco días. */
async function cargoConPosfechado(monto: string) {
  const { proveedor, cargo } = await e.proveedorConCargo();
  const pago = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto }], { fecha: haceDias(-5) }));
  expect(pago.estado, JSON.stringify(pago.cuerpo)).toBe(201);
  return { proveedor, cargo };
}

describe('un posfechado parcial', () => {
  it('deja la deuda entera, lo disponible aparte y el estado «comprometido en parte» en la ficha y la lista', async () => {
    const { proveedor, cargo } = await cargoConPosfechado('400.00');

    const delDocumento = await ficha(cargo);
    const enLista = (await lista(proveedor.proveedorId)).find((d: { id: string }) => d.id === cargo);

    for (const dto of [delDocumento, enLista]) {
      expect(dto).toMatchObject({
        saldo: '1120.00',
        comprometido: '400.00',
        disponible: '720.00',
        estadoDePago: 'comprometido_en_parte',
        comprometidoHasta: haceDias(-5),
        chequesPosfechados: 1,
      });
    }
    expect(delDocumento.pagos[0]).toMatchObject({ comprometido: true, numeroDeCheque: expect.any(String) });
    const filtrada = await lista(proveedor.proveedorId, '&estadoDePago=comprometido_en_parte');
    expect(filtrada.map((d: { id: string }) => d.id)).toEqual([cargo]);
  });

  it('el selector de pagos propone lo disponible y muestra la deuda y lo comprometido', async () => {
    const { proveedor, cargo } = await cargoConPosfechado('400.00');

    const paraPagar = (await e.propietario().get(`${RUTA}/proveedores/${proveedor.proveedorId}/para-pagar`)).cuerpo;
    const proveedores = (await e.propietario().get(`${RUTA}/pagos/proveedores-por-pagar`)).cuerpo.elementos;

    expect(paraPagar.cargos[0]).toMatchObject({
      id: cargo,
      saldo: '1120.00',
      comprometido: '400.00',
      disponible: '720.00',
      propuesto: '720.00',
    });
    expect(proveedores.find((p: { proveedorId: string }) => p.proveedorId === proveedor.proveedorId)).toMatchObject({
      porPagar: '1120.00',
      disponible: '720.00',
    });
  });

  it('pagar sobre lo comprometido sigue rechazado y pagar lo disponible pasa', async () => {
    const { proveedor, cargo } = await cargoConPosfechado('400.00');

    const demasiado = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '800.00' }]));
    const justo = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '720.00' }]));

    expect(demasiado.estado).toBe(400);
    expect(demasiado.cuerpo.error.codigo).toBe('pago_mayor_que_el_saldo');
    expect(justo.estado, JSON.stringify(justo.cuerpo)).toBe(201);
    expect(await ficha(cargo)).toMatchObject({ saldo: '400.00', disponible: '0.00', estadoDePago: 'comprometido' });
  });

  it('la ficha del pago y el comprobante traen la deuda y lo disponible del documento', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = await e.pagar(
      e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '400.00' }], { fecha: haceDias(-5) }),
    );

    const delPago = (await e.propietario().get(`${RUTA_DE_PAGOS}/${pago.cuerpo.id}`)).cuerpo;

    expect(delPago.aplicaciones[0]).toMatchObject({ saldoDelDocumento: '1120.00', disponibleDelDocumento: '720.00' });
  });
});

describe('un cargo vencido y comprometido entero', () => {
  it('sale vencido, en «Solo vencidos» y en lo vencido del proveedor con su nota de lo comprometido', async () => {
    const { proveedor, cargo } = await cargoConPosfechado('1120.00');
    await consultar('update cuentas_por_pagar.documentos set fecha_emision = $2, vencimiento = $3 where id = $1', [
      cargo,
      haceDias(20),
      haceDias(10),
    ]);

    const delDocumento = await ficha(cargo);
    const vencidos = await lista(proveedor.proveedorId, '&soloVencidos=true');
    const saldo = (await e.propietario().get(`${RUTA}/proveedores/${proveedor.proveedorId}/saldo`)).cuerpo;

    expect(delDocumento).toMatchObject({ vencido: true, estadoDePago: 'comprometido', disponible: '0.00' });
    expect(vencidos.map((d: { id: string }) => d.id)).toEqual([cargo]);
    expect(saldo).toMatchObject({
      porPagar: '1120.00',
      vencido: '1120.00',
      vencidoComprometido: '1120.00',
      comprometido: '1120.00',
      disponible: '0.00',
      cargosConSaldo: 1,
    });
    expect(saldo.posfechados).toEqual([{ numeroDeCheque: expect.any(String), fecha: haceDias(-5), monto: '1120.00' }]);
  });

  it('aún se puede cambiar su vencimiento, porque todavía se debe', async () => {
    const { cargo } = await cargoConPosfechado('1120.00');

    expect(await ficha(cargo)).toMatchObject({ puedeCambiarVencimiento: true });
  });
});

describe('el filtro por estado de pago', () => {
  it('rechaza un estado desconocido', async () => {
    const respuesta = await e.propietario().get(`${RUTA}/documentos?estadoDePago=a_medias`);

    expect(respuesta.estado).toBe(400);
  });
});
