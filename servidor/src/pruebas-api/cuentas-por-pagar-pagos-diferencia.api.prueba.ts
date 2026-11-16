/**
 * Dar por saldada la diferencia de centavos desde la ficha de un pago vigente (CP4-4): el residuo después del pago, su ajuste
 * ligado al pago con auditoría y evento, el tope, el cargo que no es del pago, el pago anulado, la fecha y los permisos.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import type { ClienteApi } from './soporte/cliente-api.js';
import { anularPago, saldarDiferencia } from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar, haceDias } from './soporte/escenario-de-documentos.js';
import { crearUsuarioConPermisos } from './soporte/escenarios.js';
import { auditoriaDe } from './soporte/ordenes-de-bancos.js';

const entorno = usarEntornoApi();
let e: EscenarioDePagos;
let soloPagos: ClienteApi;
const eventos: Array<Record<string, any>> = [];

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, 'cxppagosdif');
  busEventos.suscribir('cuentas-por-pagar.ajuste_registrado', async (datos) => {
    eventos.push(datos as unknown as Record<string, any>);
  });
  soloPagos = await crearUsuarioConPermisos(entorno, e.mundo.escenario.cuenta, {
    nombres: 'Solo pagos',
    apellidos: 'Diferencia',
    permisos: ['cuentas-por-pagar.pagos.ver', 'cuentas-por-pagar.pagos.emitir'],
  });
});

afterAll(() => {
  eventos.length = 0;
});

const ficha = async (id: string) => (await e.propietario().get(`/api/cuentas-por-pagar/documentos/${id}`)).cuerpo;

/** Un pago de Q 1,119.97 a un cargo de Q 1,120.00: quedan Q 0.03. */
async function pagoConResiduo() {
  const { proveedor, cargo } = await e.proveedorConCargo();
  const respuesta = await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1119.97' }]));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
  return { proveedor, cargo, pago: respuesta.cuerpo };
}

const rechaza = async (respuesta: { estado: number; cuerpo: any }, estado: number, codigo: string) => {
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(estado);
  expect(respuesta.cuerpo.error.codigo).toBe(codigo);
};

describe('saldar la diferencia después del pago', () => {
  it('es un ajuste del cargo ligado al pago, con motivo fijo, auditoría y evento de ingreso', async () => {
    const { cargo, pago } = await pagoConResiduo();

    const respuesta = await saldarDiferencia(e.propietario(), pago.id, { cargoId: cargo, monto: '0.03' });

    expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
    expect(respuesta.cuerpo).toMatchObject({
      id: pago.id,
      estado: 'vigente',
      diferencias: [{ cargoId: cargo, monto: '0.03' }],
    });
    expect(await ficha(cargo)).toMatchObject({ saldo: '0.00', estadoDePago: 'pagado' });
    const [ajuste] = await consultar<{ id: string; causa: string; motivo: string; estado: string }>(
      'select id, causa, motivo, estado from cuentas_por_pagar.ajustes_de_saldo where pago_id = $1',
      [pago.id],
    );
    expect(ajuste).toMatchObject({
      causa: 'diferencia_menor',
      estado: 'vigente',
      motivo: `Diferencia al pagar con el pago ${pago.numero}`,
    });
    expect(await auditoriaDe(ajuste!.id)).toEqual([
      { accion: 'ajustar', motivo: ajuste!.motivo, recurso: 'cuentas-por-pagar.ajustes' },
    ]);
    expect(eventos.find(({ ajusteId }) => ajusteId === ajuste!.id)).toMatchObject({
      efecto: 'ingreso',
      montoCentavos: 3,
      documentoId: cargo,
    });
  });

  it('rechaza lo que pasa del tope, del saldo, un cargo que no es del pago y una fecha futura', async () => {
    const { proveedor, cargo, pago } = await pagoConResiduo();
    const otroCargo = await e.cargoAutorizado(proveedor);
    await e.contrasena(proveedor, [otroCargo]);
    const otro = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: otroCargo, monto: '500.00' }]))).cuerpo;

    await rechaza(
      await saldarDiferencia(e.propietario(), pago.id, { cargoId: cargo, monto: '0.05' }),
      400,
      'diferencia_mayor_que_el_saldo',
    );
    await rechaza(
      await saldarDiferencia(e.propietario(), otro.id, { cargoId: cargo, monto: '0.01' }),
      400,
      'diferencia_fuera_del_pago',
    );
    await rechaza(
      await saldarDiferencia(e.propietario(), pago.id, { cargoId: cargo, monto: '0.03', fecha: haceDias(-3) }),
      400,
      'fecha_de_diferencia_invalida',
    );
    await rechaza(
      await saldarDiferencia(e.propietario(), pago.id, { cargoId: cargo, monto: '0.00' }),
      400,
      'monto_de_pago_invalido',
    );
    expect(await ficha(cargo)).toMatchObject({ saldo: '0.03' });
  });

  it('un residuo mayor que el tope (Q 1.00) no se ofrece: hace falta la nota de crédito', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '1100.00' }]))).cuerpo;

    await rechaza(
      await saldarDiferencia(e.propietario(), pago.id, { cargoId: cargo, monto: '20.00' }),
      400,
      'diferencia_de_pago_sobre_el_tope',
    );
  });

  it('un pago anulado no admite la diferencia y hace falta el permiso de ajustes', async () => {
    const { cargo, pago } = await pagoConResiduo();

    expect((await saldarDiferencia(soloPagos, pago.id, { cargoId: cargo, monto: '0.03' })).estado).toBe(403);
    await anularPago(e.propietario(), pago.id);

    await rechaza(
      await saldarDiferencia(e.propietario(), pago.id, { cargoId: cargo, monto: '0.03' }),
      422,
      'pago_ya_anulado',
    );
    expect(
      (await saldarDiferencia(e.propietario(), crypto.randomUUID(), { cargoId: cargo, monto: '0.03' })).estado,
    ).toBe(404);
  });
});
