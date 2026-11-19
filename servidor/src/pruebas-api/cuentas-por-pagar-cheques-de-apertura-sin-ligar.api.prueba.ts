/**
 * AP-0: el saldo del proveedor (el que usan su ficha y la ventana de pago) trae los posfechados de apertura sin ligar
 * que podrían ser suyos: los que llevan su nombre como beneficiario o cualquiera si tiene facturas de saldo inicial.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import {
  prepararEscenario,
  registrarProveedor,
  type EscenarioDeDocumentos,
} from './soporte/escenario-de-documentos.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { guardarSaldo } from './soporte/apertura-por-api.js';
import { crearPosfechadoDeApertura, ligarPosfechadoComoPropietario } from './soporte/posfechados-de-apertura.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let cuentaBancariaId: string;
let otroProveedorId: string;

const propietario = () => escenario.cuenta.propietario;
const avisoDe = async (proveedorId: string) => {
  const { estado, cuerpo } = await propietario().get(`/api/cuentas-por-pagar/proveedores/${proveedorId}/saldo`);
  expect(estado, JSON.stringify(cuerpo)).toBe(200);
  return cuerpo.chequesDeAperturaSinLigar as { cantidad: number; total: string };
};
const cargarSaldoInicial = async (proveedorId: string, numero: string) => {
  const respuesta = await propietario().post('/api/cuentas-por-pagar/saldos-iniciales', {
    proveedorId,
    tipo: 'factura',
    serie: 'a',
    numero,
    fechaEmision: '2025-12-20',
    vencimiento: '2026-01-20',
    total: '500.00',
    retenciones: '0.00',
    retencionesPorPracticar: '0.00',
    saldoPendiente: '500.00',
    referencia: null,
    tieneActivoFijo: false,
  });
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
};

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpchequesapertura', MODULOS_DE_CUENTAS_POR_PAGAR);
  otroProveedorId = (await registrarProveedor(escenario.cuenta, 'Distribuidora Norte')).proveedorId;
  await propietario().put(`/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`, { fechaDeInicio: '2026-01-01' });
  cuentaBancariaId = await crearCuentaSinSaldo(propietario());
  await guardarSaldo(propietario(), cuentaBancariaId, '1000.00');
});

describe('posfechados de apertura sin ligar en el saldo del proveedor', () => {
  it('sin posfechados no hay aviso', async () => {
    expect(await avisoDe(escenario.proveedorId)).toEqual({ cantidad: 0, total: '0.00' });
  });

  it('sin facturas de saldo inicial solo cuentan los posfechados que llevan el nombre del proveedor', async () => {
    await crearPosfechadoDeApertura(propietario(), cuentaBancariaId, {
      monto: '300.00',
      beneficiario: 'VETERINARIA EL QUIROA, S.A.',
    });
    await crearPosfechadoDeApertura(propietario(), cuentaBancariaId, { monto: '80.00', beneficiario: 'Otra persona' });

    expect(await avisoDe(escenario.proveedorId)).toEqual({ cantidad: 1, total: '300.00' });
    expect(await avisoDe(otroProveedorId)).toEqual({ cantidad: 0, total: '0.00' });
  });

  it('con facturas de saldo inicial con deuda cuenta cualquier posfechado sin ligar', async () => {
    await cargarSaldoInicial(otroProveedorId, '77');

    expect(await avisoDe(otroProveedorId)).toEqual({ cantidad: 2, total: '380.00' });
  });

  it('los posfechados ligados a un pago ya no cuentan', async () => {
    const ligado = await crearPosfechadoDeApertura(propietario(), cuentaBancariaId, {
      monto: '20.00',
      beneficiario: 'Veterinaria El Quiroa',
    });
    const antes = await avisoDe(otroProveedorId);
    await ligarPosfechadoComoPropietario(ligado);

    expect(antes).toEqual({ cantidad: 3, total: '400.00' });
    expect(await avisoDe(otroProveedorId)).toEqual({ cantidad: 2, total: '380.00' });
  });

  it('la ventana de pago trae el mismo aviso', async () => {
    const { estado, cuerpo } = await propietario().get(
      `/api/cuentas-por-pagar/proveedores/${otroProveedorId}/para-pagar`,
    );

    expect(estado, JSON.stringify(cuerpo)).toBe(200);
    expect(cuerpo.chequesDeAperturaSinLigar).toEqual({ cantidad: 2, total: '380.00' });
  });
});
