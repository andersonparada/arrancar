/**
 * Los eventos `pago_registrado` y `pago_anulado` llevan la cuenta y el usuario que los causó (cambio aditivo del
 * contrato): con ellos un suscriptor, como el aviso de pago por correo, arma su propia unidad de trabajo.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { busEventos } from '../modulos/core/eventos/bus-eventos.js';
import { anularPago } from './soporte/cuentas-por-pagar-pagos-cambios.js';
import { EscenarioDePagos } from './soporte/cuentas-por-pagar-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { consultar } from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
const USUARIO = 'cxppagoseventos';
let e: EscenarioDePagos;
let usuarioId: string;
const registrados: Array<Record<string, any>> = [];
const anulados: Array<Record<string, any>> = [];
const bajas: Array<() => void> = [];

beforeAll(async () => {
  e = await EscenarioDePagos.preparar(entorno, USUARIO);
  usuarioId = (await consultar<{ id: string }>('select id from core.usuarios where usuario = $1', [USUARIO]))[0]!.id;
  bajas.push(
    busEventos.suscribirSinRomper('cuentas-por-pagar.pago_registrado', (datos) => void registrados.push(datos)),
    busEventos.suscribirSinRomper('cuentas-por-pagar.pago_anulado', (datos) => void anulados.push(datos)),
  );
});

afterAll(() => {
  bajas.forEach((baja) => baja());
});

describe('eventos de pagos con cuenta y usuario', () => {
  it('registrar un pago publica pago_registrado con la cuenta, la empresa y quien lo registró', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();

    const pago = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '100.00' }]))).cuerpo;

    const evento = registrados.find((datos) => datos.pagoId === pago.id);
    expect(evento).toMatchObject({
      empresaId: e.mundo.escenario.cuenta.empresaId,
      cuentaId: e.mundo.escenario.cuenta.cuentaId,
      usuarioId,
    });
  });

  it('anular un pago publica pago_anulado con la cuenta, la empresa y quien lo anuló', async () => {
    const { proveedor, cargo } = await e.proveedorConCargo();
    const pago = (await e.pagar(e.cheque(proveedor.proveedorId, [{ cargoId: cargo, monto: '100.00' }]))).cuerpo;

    const respuesta = await anularPago(e.propietario(), pago.id, { motivo: 'Se emitió por error' });

    expect(respuesta.estado).toBe(200);
    expect(anulados.find((datos) => datos.pagoId === pago.id)).toMatchObject({
      empresaId: e.mundo.escenario.cuenta.empresaId,
      cuentaId: e.mundo.escenario.cuenta.cuentaId,
      usuarioId,
    });
  });
});
